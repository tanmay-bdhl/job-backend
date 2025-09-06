import argparse
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, TypedDict

import torch
from pypdf import PdfReader
from tqdm import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

from langgraph.graph import END, START, StateGraph
from langchain_text_splitters import RecursiveCharacterTextSplitter


class ResumeSummaryState(TypedDict, total=False):
    pdf_path: str
    model_id: str
    max_chunk_size: int
    chunk_overlap: int
    max_new_tokens: int
    temperature: float
    top_p: float

    raw_text: str
    chunks: List[str]
    chunk_summaries: List[str]
    final_summary: str


def extract_text_from_pdf(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    text_parts: List[str] = []
    for page in reader.pages:
        try:
            extracted = page.extract_text() or ""
        except Exception:
            extracted = ""
        if extracted:
            text_parts.append(extracted)
    return "\n\n".join(text_parts).strip()


def load_hf_pipeline(model_id: str, max_new_tokens: int, temperature: float, top_p: float):
    tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True)

    # Try efficient dtypes when possible
    dtype = torch.float16
    if torch.backends.mps.is_available():
        # MPS prefers float16/bfloat16; keep float16
        dtype = torch.float16
    elif not torch.cuda.is_available():
        # CPU only – use bfloat16 if available, else float32
        dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float32

    # Attempt to load with device_map auto. This will place layers on available devices.
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=dtype,
        device_map="auto",
        low_cpu_mem_usage=True,
    )

    # Build a text-generation pipeline
    text_gen = pipeline(
        task="text-generation",
        model=model,
        tokenizer=tokenizer,
        # device_map is already set on model; no explicit device arg needed
        do_sample=False if temperature == 0 else True,
        temperature=temperature,
        top_p=top_p,
        max_new_tokens=max_new_tokens,
        repetition_penalty=1.05,
        pad_token_id=tokenizer.eos_token_id,
    )
    return text_gen, tokenizer


def build_chunk_prompt(chunk_text: str) -> str:
    return (
        "You are an expert technical recruiter and career coach. "
        "Given the following resume section, write a concise, information-dense summary capturing: "
        "(1) core skills and technologies, (2) most significant achievements with impact/metrics, "
        "(3) leadership, ownership, or cross-functional experience, and (4) education, certifications, or awards.\n\n"
        f"Resume section:\n---\n{chunk_text}\n---\n\n"
        "Return a short bullet list (3-6 bullets)."
    )


def build_synthesis_prompt(chunk_summaries: List[str]) -> str:
    bullet_points = "\n".join(f"- {s.strip()}" for s in chunk_summaries if s.strip())
    return (
        "You are an expert resume analyst. You are given multiple partial summaries extracted from a resume. "
        "Synthesize them into a single comprehensive, non-redundant professional summary suitable for a recruiter.\n\n"
        f"Partial summaries:\n{bullet_points}\n\n"
        "Requirements:\n"
        "- Integrate information, remove duplicates, and ensure coherence.\n"
        "- Emphasize measurable impact, scale, complexity, and leadership.\n"
        "- Highlight top skills, domains, and tools accurately.\n"
        "- Produce 1-2 short paragraphs followed by a crisp 5-8 bullet skill snapshot.\n"
        "- Avoid hallucinations. Only use provided content.\n\n"
        "Output format:\n"
        "Paragraphs first, then a 'Key skills' bullet list."
    )


# -------- LangGraph node functions --------
def node_extract(state: ResumeSummaryState) -> ResumeSummaryState:
    raw_text = extract_text_from_pdf(state["pdf_path"])
    return {**state, "raw_text": raw_text}


def node_split(state: ResumeSummaryState) -> ResumeSummaryState:
    max_chunk = state.get("max_chunk_size", 1600)
    overlap = state.get("chunk_overlap", 200)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chunk,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", ".", " "]
    )
    chunks = splitter.split_text(state.get("raw_text", ""))
    return {**state, "chunks": chunks}


def node_map_summarize(state: ResumeSummaryState) -> ResumeSummaryState:
    model_id = state["model_id"]
    max_new_tokens = state.get("max_new_tokens", 256)
    temperature = state.get("temperature", 0.0)
    top_p = state.get("top_p", 0.9)
    chunks = state.get("chunks", [])

    if not chunks:
        return {**state, "chunk_summaries": []}

    text_gen, tokenizer = load_hf_pipeline(model_id, max_new_tokens, temperature, top_p)

    summaries: List[str] = [""] * len(chunks)

    def summarize_one(index: int, text: str) -> None:
        prompt = build_chunk_prompt(text)
        # Use chat-like wrapping if model expects it; here we send plain prompt
        outputs = text_gen(prompt)
        generated = outputs[0]["generated_text"][len(prompt):].strip()
        summaries[index] = generated

    with ThreadPoolExecutor(max_workers=min(4, max(1, os.cpu_count() or 2))) as pool:
        futures = [pool.submit(summarize_one, i, chunk) for i, chunk in enumerate(chunks)]
        for _ in tqdm(as_completed(futures), total=len(futures), desc="Summarizing chunks"):
            pass

    return {**state, "chunk_summaries": summaries}


def node_synthesize(state: ResumeSummaryState) -> ResumeSummaryState:
    model_id = state["model_id"]
    max_new_tokens = max(384, state.get("max_new_tokens", 256))
    temperature = state.get("temperature", 0.0)
    top_p = state.get("top_p", 0.9)
    chunk_summaries = state.get("chunk_summaries", [])

    text_gen, tokenizer = load_hf_pipeline(model_id, max_new_tokens, temperature, top_p)

    prompt = build_synthesis_prompt(chunk_summaries)
    outputs = text_gen(prompt)
    final = outputs[0]["generated_text"][len(prompt):].strip()
    return {**state, "final_summary": final}


def build_graph():
    graph = StateGraph(ResumeSummaryState)
    graph.add_node("extract", node_extract)
    graph.add_node("split", node_split)
    graph.add_node("map_summarize", node_map_summarize)
    graph.add_node("synthesize", node_synthesize)

    graph.add_edge(START, "extract")
    graph.add_edge("extract", "split")
    graph.add_edge("split", "map_summarize")
    graph.add_edge("map_summarize", "synthesize")
    graph.add_edge("synthesize", END)
    return graph.compile()


def parse_args():
    parser = argparse.ArgumentParser(description="Resume summarization via LangGraph + HF model")
    parser.add_argument("--pdf", required=True, help="Path to the resume PDF file")
    parser.add_argument(
        "--model",
        default=os.environ.get("RESUME_SUMMARY_MODEL", "openai/gpt-oss-20b"),
        help="Hugging Face model ID (default: openai/gpt-oss-20b)",
    )
    parser.add_argument("--max-chunk", type=int, default=1600, help="Chunk size for splitting text")
    parser.add_argument("--overlap", type=int, default=200, help="Overlap between chunks")
    parser.add_argument("--max-new-tokens", type=int, default=256, help="Max new tokens for chunk summaries")
    parser.add_argument("--temperature", type=float, default=0.0, help="Sampling temperature (0 = greedy)")
    parser.add_argument("--top-p", type=float, default=0.9, help="Top-p nucleus sampling")
    parser.add_argument("--output", type=str, default=None, help="Optional path to write final summary")
    return parser.parse_args()


def main():
    args = parse_args()
    if not os.path.exists(args.pdf):
        raise FileNotFoundError(f"PDF not found: {args.pdf}")

    state: ResumeSummaryState = {
        "pdf_path": args.pdf,
        "model_id": args.model,
        "max_chunk_size": args.max_chunk,
        "chunk_overlap": args.overlap,
        "max_new_tokens": args.max_new_tokens,
        "temperature": args.temperature,
        "top_p": args.top_p,
    }

    app = build_graph()
    final_state = app.invoke(state)

    summary = final_state.get("final_summary", "")
    if not summary:
        print("No summary produced.")
        return

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(summary)
        print(f"Summary written to: {args.output}")
    else:
        print("\n===== Comprehensive Resume Summary =====\n")
        print(summary)


if __name__ == "__main__":
    main()




