# Infrastruktura jako kod (IaC)

🏗️ **Automatyczne tworzenie infrastruktury** w Microsoft Azure

---

## 📁 Struktura

```
infra/
├── terraform/           # Konfiguracja Terraform
│   ├── main.tf         # Główne zasoby Azure
│   ├── variables.tf    # Zmienne konfiguracyjne
│   ├── outputs.tf      # Wartości wyjściowe
│   └── terraform.tfvars.example
├── arm/                # Azure Resource Manager templates (alternatywa)
│   └── main.json
├── scripts/            # Skrypty pomocnicze
│   ├── deploy.sh       # Automatyczne wdrożenie
│   └── cleanup.sh      # Usuwanie zasobów
└── README.md          # Ta dokumentacja
```

---

## ☁️ Planowane zasoby Azure

### Container Instances (ACI)
- **Frontend**: React app (nginx)
- **Auth Service**: FastAPI container
- **Movies Service**: FastAPI container

### Baza danych
- **Azure Cosmos DB** (MongoDB API)
- Alternatywnie: **MongoDB Atlas**

### Sieć i bezpieczeństwo
- **Application Gateway** (load balancer + SSL)
- **Key Vault** (sekrety i certyfikaty)
- **Log Analytics** (monitoring)

### Container Registry
- **Azure Container Registry** (obrazy Docker)

---

## 🛠️ Narzędzia

### Terraform (główne)
- Deklaratywne definiowanie infrastruktury
- State management
- Plan/Apply workflow

### Azure CLI (pomocnicze)
- Skrypty deployment
- Pierwsze ustawienia

---

## 🚀 Użycie (gdy będzie gotowe)

### Przygotowanie
```bash
# Zaloguj się do Azure
az login

# Ustaw subskrypcję
az account set --subscription "your-subscription-id"

# Przejdź do katalogu terraform
cd infra/terraform
```

### Deployment
```bash
# Inicjalizacja Terraform
terraform init

# Plan zmian
terraform plan

# Zastosuj zmiany
terraform apply
```

### Cleanup
```bash
# Usuń wszystkie zasoby
terraform destroy
```

---

## 📋 Planowane zmienne (terraform.tfvars)

```hcl
# Podstawowe ustawienia
resource_group_name = "movie-rental-rg"
location           = "West Europe"
environment        = "dev"  # dev, staging, prod

# Container Registry
acr_name = "movierentalacr"

# Cosmos DB
cosmos_account_name = "movie-rental-cosmos"
cosmos_database_name = "movie_rental"

# Container Instances
frontend_container_name = "movie-rental-frontend"
auth_container_name    = "movie-rental-auth"
movies_container_name  = "movie-rental-movies"

# Sieć
virtual_network_name = "movie-rental-vnet"
subnet_name         = "container-subnet"

# Key Vault
key_vault_name = "movie-rental-kv"

# Monitoring
log_analytics_workspace = "movie-rental-logs"
```

---

## 🔒 Bezpieczeństwo

### Key Vault (sekrety)
- JWT signing key
- Cosmos DB connection string
- Container registry credentials

### Network Security Groups
- Ograniczenie ruchu między kontenerami
- HTTPS only dla publicznych endpointów

### Managed Identity
- Kontenery używają Managed Identity
- Brak hard-coded credentials

---

## 💰 Szacowane koszty (dev environment)

| Zasób | Szacunek miesięczny |
|-------|---------------------|
| Container Instances (3x) | ~$30 |
| Cosmos DB (dev tier) | ~$25 |
| Container Registry | ~$5 |
| Application Gateway | ~$20 |
| Key Vault | ~$2 |
| **Razem** | **~$82/miesiąc** |

*Uwaga: Koszty orientacyjne, rzeczywiste mogą się różnić*

---

## 📊 Monitoring i logi

### Log Analytics
- Logi kontenerów
- Metryki wydajności
- Alerty

### Application Insights
- Monitoring aplikacji
- Śledzenie requestów
- Wykrywanie błędów

---

## 🔄 CI/CD Integration

Infrastruktura będzie tworzona automatycznie przez GitHub Actions:

```yaml
# .github/workflows/infrastructure.yml
name: Deploy Infrastructure

on:
  push:
    paths:
      - 'infra/**'
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    env:
      ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        
      - name: Terraform Init
        run: terraform init
        working-directory: infra/terraform
        
      - name: Terraform Plan
        run: terraform plan
        working-directory: infra/terraform
        
      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: infra/terraform
```

---

## 🧪 Status implementacji

- [ ] **Terraform - podstawowe zasoby**
- [ ] **Container Registry**
- [ ] **Cosmos DB**
- [ ] **Container Instances**
- [ ] **Application Gateway**
- [ ] **Key Vault**
- [ ] **Monitoring i logi**
- [ ] **Network Security Groups**
- [ ] **Skrypty deployment**
- [ ] **GitHub Actions integration**

---

## 👨‍💻 Dla deweloperów

### Wymagania
- Azure CLI
- Terraform 1.0+
- Uprawnienia Contributor w Azure subscription

### Przydatne komendy
```bash
# Sprawdź zasoby w resource group
az resource list --resource-group movie-rental-rg --output table

# Logi z Container Instance
az container logs --resource-group movie-rental-rg --name movie-rental-auth

# Restart kontenera
az container restart --resource-group movie-rental-rg --name movie-rental-auth
```