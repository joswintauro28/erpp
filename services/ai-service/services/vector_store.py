import chromadb
from chromadb.config import Settings
import uuid

class LocalVectorStore:
    def __init__(self):
        # Initialize standard Chroma ephemeral client (in-memory)
        self.client = chromadb.EphemeralClient()
        
        # Create standard collection
        self.collection = self.client.get_or_create_collection(
            name="kaasvex_corporate_rag",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Seed basic policies and RAG indexes
        self.seed_corporate_policies()
        
    def seed_corporate_policies(self):
        # Add basic business guidelines to act as corporate RAG knowledge context
        documents = [
            "Kaasvex Corporate Expense Policy: Employees are entitled to a maximum daily allowance of ₹2,500 for dining and meals during outstation travel. Any single expense exceeding ₹10,000 is flagged as a caps breach and requires VP finance level approval.",
            "Kaasvex Taxation and Compliance Rulebook: Standard operating SaaS softwares, cloud computing instances (AWS, Google Cloud), and subscription toolkits are taxed under the GST rate of 18% (CGST 9% + SGST 9%). Reverse Charge Mechanism (RCM) is applied if purchasing from unregistered local service providers.",
            "Outstanding invoice reminder timeline: Standard invoice payments are due exactly 30 days after creation. When invoices are 5 days overdue, an automated WhatsApp reminder is queued. When 15 days overdue, an orange amber alert is raised on the cashcollection board.",
            "Corporate Credit Card Policy: Mashed cards allocated to CEOs or development leads are locked at a ₹5,00,000.0 monthly limit. Active toggles allow temporary card freezing to prevent credit risk or transaction anomalies."
        ]
        
        metadatas = [
            {"source": "expense_policy", "scope": "corporate"},
            {"source": "tax_code", "scope": "compliance"},
            {"source": "invoice_procedures", "scope": "collection"},
            {"source": "card_policy", "scope": "finance"}
        ]
        
        ids = [str(uuid.uuid4()) for _ in range(len(documents))]
        
        # Chroma client handles standard mock local document indexing
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
    def query_rag_context(self, question: str, n_results: int = 2) -> str:
        """
        Retrieves matching document guidelines to construct RAG prompt context.
        """
        try:
            results = self.collection.query(
                query_texts=[question],
                n_results=n_results
            )
            # Flatten matched list
            flat_docs = [doc for sublist in results['documents'] for doc in sublist]
            return "\n\n".join(flat_docs)
        except Exception:
            # Fallback keyword match if Chroma indexing encounters system environment limits
            fallback_docs = [
                "Expense Allowance Caps: Maximum ₹2,500 daily dining limit. Exceeding ₹10,000 raises anomaly alerts.",
                "Tax codes: SaaS Cloud Subscriptions are taxed at a standard 18% GST rate."
            ]
            return "\n\n".join(fallback_docs)

# Singleton vector store instance
vector_store = LocalVectorStore()
