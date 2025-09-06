const mongoose = require('mongoose');
const AnalysisEvent = require('../models/AnalysisEvent');
const websocketService = require('./websocketService');

class ChangeStreamService {
  constructor() {
    this.changeStream = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      console.log('[CHANGE_STREAM] Initializing MongoDB change streams...');

      this.changeStream = AnalysisEvent.watch([
        {
          $match: {
            $or: [
              { operationType: 'insert' },
              { operationType: 'update' },
              { operationType: 'replace' }
            ]
          }
        }
      ], {
        fullDocument: 'updateLookup'
      });

      this.changeStream.on('change', async (change) => {
        await this.handleChange(change);
      });

      this.changeStream.on('error', (error) => {
        console.error('[CHANGE_STREAM][ERROR]', error.message);
        this.restart();
      });

      this.changeStream.on('close', () => {
        console.log('[CHANGE_STREAM] Change stream closed');
        if (this.isRunning) {
          this.restart();
        }
      });

      this.isRunning = true;
      console.log('[CHANGE_STREAM] MongoDB change streams initialized successfully');

    } catch (error) {
      console.error('[CHANGE_STREAM][INIT][ERROR]', error.message);
      throw error;
    }
  }

  async handleChange(change) {
    try {
      const { operationType, fullDocument } = change;

      if (!fullDocument) {
        return;
      }

      console.log(`[CHANGE_STREAM] ${operationType} event for analysis: ${fullDocument.analysisId}`);

      switch (operationType) {
        case 'insert':
          await this.handleInsert(fullDocument);
          break;
        case 'update':
        case 'replace':
          await this.handleUpdate(fullDocument);
          break;
      }

    } catch (error) {
      console.error('[CHANGE_STREAM][HANDLE][ERROR]', error.message);
    }
  }

  async handleInsert(document) {
    try {
      console.log(`[CHANGE_STREAM] New analysis created: ${document.analysisId}`);

      this.broadcastStatusUpdate(document);

    } catch (error) {
      console.error('[CHANGE_STREAM][INSERT][ERROR]', error.message);
    }
  }

  async handleUpdate(document) {
    try {
      console.log(`[CHANGE_STREAM] Analysis updated: ${document.analysisId}, status: ${document.status}`);

      this.broadcastStatusUpdate(document);

      await this.handleStatusChange(document);

    } catch (error) {
      console.error('[CHANGE_STREAM][UPDATE][ERROR]', error.message);
    }
  }
  async handleStatusChange(document) {
    switch (document.status) {
      case 'completed':
        console.log(`[CHANGE_STREAM] Analysis completed: ${document.analysisId}`);
        break;
      case 'error':
        console.log(`[CHANGE_STREAM] Analysis error: ${document.analysisId} - ${document.error}`);
        break;
      case 'cancelled':
        console.log(`[CHANGE_STREAM] Analysis cancelled: ${document.analysisId}`);
        break;
    }
  }

  broadcastStatusUpdate(document) {
    const statusData = {
      status: document.status,
      progress: document.progress,
      currentStage: document.currentStage,
      error: document.error
    };

    if (document.status === 'completed' && document.results) {
      statusData.results = document.results;
    }

    console.log(`[CHANGE_STREAM] Broadcasting status update for: ${document.analysisId} - ${document.status}`);
    websocketService.broadcastStatusUpdate(document.analysisId, statusData);
  }

  async markAnalysisError(analysisId, errorMessage) {
    try {
      await AnalysisEvent.findOneAndUpdate(
        { analysisId },
        {
          status: 'error',
          currentStage: 'error',
          error: errorMessage,
          updatedAt: new Date()
        }
      );
    } catch (error) {
      console.error('[CHANGE_STREAM][ERROR_UPDATE][ERROR]', error.message);
    }
  }

  async restart() {
    if (this.changeStream) {
      console.log('[CHANGE_STREAM] Restarting change stream...');
      try {
        await this.changeStream.close();
      } catch (error) {
        console.error('[CHANGE_STREAM][CLOSE][ERROR]', error.message);
      }
    }

    setTimeout(() => {
      if (this.isRunning) {
        this.initialize().catch(error => {
          console.error('[CHANGE_STREAM][RESTART][ERROR]', error.message);
        });
      }
    }, 5000);
  }

  async shutdown() {
    console.log('[CHANGE_STREAM] Shutting down change stream...');
    this.isRunning = false;

    if (this.changeStream) {
      try {
        await this.changeStream.close();
        console.log('[CHANGE_STREAM] Change stream closed successfully');
      } catch (error) {
        console.error('[CHANGE_STREAM][SHUTDOWN][ERROR]', error.message);
      }
    }
  }

  async updateAnalysisStatus(analysisId, statusUpdate) {
    try {
      const updateData = {
        updatedAt: new Date(),
        ...statusUpdate
      };

      if (statusUpdate.status === 'completed') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }

      const updatedEvent = await AnalysisEvent.findOneAndUpdate(
        { analysisId },
        updateData,
        { new: true }
      );

      if (updatedEvent) {
        console.log(`[CHANGE_STREAM] External status update for: ${analysisId}`);
        return updatedEvent;
      } else {
        throw new Error(`Analysis not found: ${analysisId}`);
      }

    } catch (error) {
      console.error('[CHANGE_STREAM][EXTERNAL_UPDATE][ERROR]', error.message);
      throw error;
    }
  }
}

const changeStreamService = new ChangeStreamService();
module.exports = changeStreamService;
