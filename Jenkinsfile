pipeline {
    agent any

    environment {
        // Zmienne konfiguracyjne
        AZURE_RG = 'filmy'
        ACR_NAME = 'movies'
        ACR_URL = 'movies.azurecr.io'
        
        // Credentials ID z Jenkinsa
        AZURE_CREDENTIALS_ID = 'azure-sp-credentials'
    }

    stages {
        stage('Checkout') {
            steps {
                // Pobranie kodu z repozytorium
                checkout scm
            }
        }

        stage('Login to Azure') {
            steps {
                withCredentials([usernamePassword(credentialsId: AZURE_CREDENTIALS_ID, passwordVariable: 'AZURE_CLIENT_SECRET', usernameVariable: 'AZURE_CLIENT_ID')]) {
                    sh 'az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant 50c76291-0c80-4444-a2fb-4f8ab168c311' // Podmień Tenant ID z JSONa
                    sh 'az acr login --name $ACR_NAME'
                }
            }
        }

        // --- AUTH SERVICE ---
        stage('Build & Test Auth Service') {
            steps {
                script {
                    // 1. Budowanie
                    sh 'docker build -t $ACR_URL/auth-service:${BUILD_NUMBER} -f services/auth-service/Dockerfile .'
                    
                    // 2. Testy (To miejsce na przyszłe testy!)
                    // Uruchamiamy tymczasowy kontener, instalujemy pytest i wykonujemy testy
                    sh 'docker run --rm $ACR_URL/auth-service:${BUILD_NUMBER} sh -c "pip install pytest && pytest"' 
                    echo 'Testy Auth Service pominięte (brak plików testowych)'
                }
            }
        }

        // --- MOVIES SERVICE ---
        stage('Build & Test Movies Service') {
            steps {
                script {
                    sh 'docker build -t $ACR_URL/movies-service:${BUILD_NUMBER} -f services/movies-service/Dockerfile .'
                    
                    // Testy (Przykład uruchomienia testu połączenia, który już masz)
                    // sh 'docker run --rm --env-file .env.example $ACR_URL/movies-service:${BUILD_NUMBER} python app/test_connection.py'
                    echo 'Testy Movies Service pominięte'
                }
            }
        }

        // --- FRONTEND ---
        stage('Build Frontend') {
            steps {
                script {
                    // Budujemy frontend podając prawdziwe adresy API na Azure
                    // UWAGA: Podmień adresy URL na Twoje z Azure Container Apps!
                    sh """
                    docker build -t $ACR_URL/frontend:${BUILD_NUMBER} \
                    --build-arg VITE_AUTH_API=https://auth-service.politeisland-fa1eb10b.germanywestcentral.azurecontainerapps.io \
                    --build-arg VITE_MOVIES_API_URL=https://movies-service.politeisland-fa1eb10b.germanywestcentral.azurecontainerapps.io \
                    ./frontend
                    """
                }
            }
        }

        stage('Push Images') {
            steps {
                sh 'docker push $ACR_URL/auth-service:${BUILD_NUMBER}'
                sh 'docker push $ACR_URL/movies-service:${BUILD_NUMBER}'
                sh 'docker push $ACR_URL/frontend:${BUILD_NUMBER}'
                
                // Oznaczamy też jako 'latest'
                sh 'docker tag $ACR_URL/auth-service:${BUILD_NUMBER} $ACR_URL/auth-service:latest'
                sh 'docker push $ACR_URL/auth-service:latest'
                // ... powtórz dla pozostałych jeśli chcesz
            }
        }

        stage('Deploy to Azure Container Apps') {
            steps {
                // Aktualizacja kontenerów nowym obrazem
                sh "az containerapp update --name auth-service --resource-group $AZURE_RG --image $ACR_URL/auth-service:${BUILD_NUMBER}"
                sh "az containerapp update --name movies-service --resource-group $AZURE_RG --image $ACR_URL/movies-service:${BUILD_NUMBER}"
                sh "az containerapp update --name frontend --resource-group $AZURE_RG --image $ACR_URL/frontend:${BUILD_NUMBER}"
            }
        }
    }
}
