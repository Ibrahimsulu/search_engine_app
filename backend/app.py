import os
import re
import pyterrier as pt
import pandas as pd
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
import numpy as np
from difflib import SequenceMatcher
from flask_cors import CORS

# Flask setup
app = Flask(__name__)
CORS(app)

# File paths
news_file = "backend/data/news.csv"
jobs_file = "backend/data/jobs.csv"
news_output = "backend/data/processed_news.csv"
jobs_output = "backend/data/processed_jobs.csv"

# Check if files exist
if not os.path.exists(news_file) or not os.path.exists(jobs_file):
    raise FileNotFoundError("One or both input files are missing.")

# Read CSV files
news = pd.read_csv(news_file)
jobs = pd.read_csv(jobs_file)

# Process news dataset
news = news.rename(columns={"headlines": "title", "read_more": "link", "text": "description"})
news = news[["title", "description", "date", "link"]]
news['type'] = 'news'

# Process jobs dataset
jobs = jobs[['url', 'job_title', 'company_name', 'job_location', 'job_summary', 
             'job_seniority_level', 'job_employment_type', 'company_logo']].dropna()
jobs = jobs.rename(columns={
    'job_title': 'title', 
    'job_summary': 'description', 
    'job_location': 'location',
    'company_name': 'company',
    'company_logo': 'logo'
})
jobs['type'] = 'job'

# Save separately
news.to_csv(news_output, index=False)
jobs.to_csv(jobs_output, index=False)

# === Setup ===
try:
    if not pt.java.started():
        pt.java.init()
except AttributeError:
    # Fallback if started() is not available
    pt.init()

# === Normalization for special tech keywords ===
special_replacements = {
    ".net": "dotnet net",
    "c#": "csharp",
    "c++": "cpp",
    "node.js": "nodejs node",
    "react.js": "reactjs react",
    "frontend": "front end",
    "back-end": "backend"
}

def normalize_text(text):
    text = str(text).lower()
    for k, v in special_replacements.items():
        text = text.replace(k, v)
    return text

# Apply normalization to text field
jobs['text'] = (jobs['title'] + " " + 
                jobs['description'] + " " + 
                jobs['job_seniority_level'] + " " + 
                jobs['job_employment_type'] + " " + 
                jobs['company'] + " " + 
                jobs['location'] + " " + 
                jobs['logo'])
jobs['text'] = jobs['text'].apply(normalize_text)

news['docno'] = news.index.astype(str)
news['text'] = news['title'] + " " + news['description']

jobs['docno'] = jobs.index.astype(str)

# Initialize news indexer and check if index exists
news_index_dir = "./news_index"
if not os.path.exists(news_index_dir):
    news_indexer = pt.IterDictIndexer(news_index_dir)
    news_indexref = news_indexer.index(news.to_dict(orient="records"))
    print("News index created.")
else:
    print("News index already exists, skipping reindexing.")
    news_indexref = pt.IndexFactory.of(news_index_dir)  # Load existing index

# Initialize jobs indexer and check if index exists
jobs_index_dir = "./jobs_index"
if not os.path.exists(jobs_index_dir):
    jobs_indexer = pt.IterDictIndexer(jobs_index_dir, overwrite=True)
    jobs_indexref = jobs_indexer.index(jobs.to_dict(orient="records"))
    print("Jobs index created.")
else:
    print("Jobs index already exists, skipping reindexing.")
    jobs_indexref = pt.IndexFactory.of(jobs_index_dir)  # Load existing index

# Initialize the retrievers for news and jobs
news_retriever = pt.BatchRetrieve(news_indexref, wmodel="BM25")
jobs_retriever = pt.BatchRetrieve(jobs_indexref, wmodel="BM25")

# === Synonym Mapping ===
seniority_synonyms = {
    "entry level": ["graduate", "junior", "intern", "new grad"],
    "mid level": ["mid", "intermediate"],
    "senior level": ["senior", "lead", "principal"]
}

def normalize_seniority(query):
    for key, synonyms in seniority_synonyms.items():
        if key in query:
            return key
        for synonym in synonyms:
            if synonym in query:
                return key
    return None

# Synonym dictionary for common job search terms
synonym_map = {
    'graduate': 'entry level',
    'junior': 'entry level',
    'beginner': 'entry level',
    'entry-level': 'entry level',
    '.net': 'net dotnet',
    'c sharp': 'c#',
    'react js': 'react',
    'frontend': 'front end',
    'backend': 'back end',
    'devops': 'development operations',
    'remote': 'work from home',
}

def apply_synonyms(text):
    for key, value in synonym_map.items():
        pattern = r'\b' + re.escape(key) + r'\b'
        text = re.sub(pattern, value, text)
    return text

def clean_query(text):
    res = ""
    for c in text:
        if c.isalnum():
            res += c
        elif c == " ":
            res += c
        elif c == "-":
            res += " "
    return res

# --- News Search Function ---
def smart_news_search(user_query):
    q = clean_query(user_query.lower())
    q = apply_synonyms(q)
    results = news_retriever.search(q)
    detailed = news.iloc[results['docno'].astype(int)].reset_index(drop=True)
    detailed['score'] = results['score']
    detailed = detailed.sort_values(by='score', ascending=False)
    return detailed[['title', 'description', 'link', 'date', 'score']]

# === Enhanced Smart Job Search Function ===
def smart_job_search(user_query):
    q = clean_query(user_query.lower())
    q = apply_synonyms(q)

    # Extract filters
    seniority = normalize_seniority(q)

    employment_types = ["full-time", "part-time", "contract", "internship", "temporary"]
    employment_type = next((etype for etype in employment_types if etype in q), None)

    location_match = re.search(r"in ([\w\s]+)", q)
    company_match = re.search(r"at ([\w\s]+)", q)
    location = location_match.group(1).strip() if location_match else None
    company = company_match.group(1).strip() if company_match else None

    # Remove filter words from core query
    core_query = q
    for word in filter(None, [seniority] + sum(seniority_synonyms.values(), []) + employment_types + [location, company]):
        if word:
            core_query = core_query.replace(word.lower(), "")
    core_query = re.sub(r"\b(in|at)\b", "", core_query).strip()

    # === Step 1: BM25 Search with PyTerrier ===
    results = jobs_retriever.search(core_query)
    detailed = jobs.iloc[results['docno'].astype(int)].reset_index(drop=True)
    detailed['score'] = results['score']

    # === Step 2: Apply filters for title, seniority, etc. ===
    if seniority:
        detailed = detailed[detailed['job_seniority_level'].str.lower().str.contains(seniority.lower(), na=False)]
    if employment_type:
        detailed = detailed[detailed['job_employment_type'].str.lower().str.contains(employment_type.lower(), na=False)]
    if location:
        detailed = detailed[detailed['location'].str.lower().str.contains(location.lower(), na=False)]
    if company:
        detailed = detailed[detailed['company'].str.lower().str.contains(company.lower(), na=False)]

    # === Step 3: Score boosting for title matching ===
    title_weight = 10.0
    seniority_penalty = 0.7 if seniority == "entry level" else 1.0
    core_query_lower = core_query.lower()

    def fuzzy_match_ratio(a, b):
        return SequenceMatcher(None, a, b).ratio()

    boosted_scores = []
    for _, row in detailed.iterrows():
        title = str(row['title']).lower()
        score = row['score']

        # Boost if title closely matches the query
        match_score = fuzzy_match_ratio(title, core_query_lower)
        if match_score > 0.6:  # You can adjust this threshold
            score *= title_weight

        # Penalize if not entry-level and query implied entry-level
        job_seniority = str(row.get('job_seniority_level', '')).lower()
        if seniority == "entry level" and "entry" not in job_seniority:
            score *= seniority_penalty

        boosted_scores.append(score)

    detailed['score'] = boosted_scores

    # Sort by score and return top 10 results
    detailed = detailed.sort_values(by='score', ascending=False)
    return detailed[['title', 'company', 'location', 'job_seniority_level', 'job_employment_type', 'score','url','description']]

@app.route('/search', methods=['GET'])
def search():
    search_type = request.args.get('type')
    user_query = request.args.get('term', '')
    start = int(request.args.get('start', 0))  # Default to 0 if no 'start' value
    page_size = 10  # Number of results per page

    if not user_query:
        return jsonify({"error": "Term is required"}), 400

    if search_type == 'jobs':
        results = smart_job_search(user_query)
    elif search_type == 'news':
        results = smart_news_search(user_query)
    else:
        return jsonify({"error": "Invalid search type"}), 400

    total_results = len(results)

    if isinstance(results, pd.DataFrame):
        paginated_results = results.iloc[start:start+page_size].to_dict(orient="records")
    elif isinstance(results, list):
        paginated_results = results[start:start+page_size]
    else:
        return jsonify({"error": "Invalid results format"}), 500

    return jsonify({
        "results": paginated_results,
        "total": total_results
    })



if __name__ == '__main__':
    app.run(debug=True)
