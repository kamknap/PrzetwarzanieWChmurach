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
                    sh 'az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant 50c76291-0c80-4444-a2fb-4f8ab168c311' 
                    sh 'az acr login --name $ACR_NAME'
                }
            }
        }

        // --- AUTH SERVICE ---
        stage('Build & Test Auth Service') {
            steps {
                script {

                    sh 'docker build -t $ACR_URL/auth-service:${BUILD_NUMBER} -f services/auth-service/Dockerfile .'

                    // Testy auth service
                    sh 'docker run --rm $ACR_URL/auth-service:${BUILD_NUMBER} sh -c "pip install pytest httpx && pytest"'
                    echo '✅ --- [Auth Service] Testy zakończone sukcesem! ---'
                }
            }
        }

        // --- MOVIES SERVICE ---
        stage('Build & Test Movies Service') {
            steps {
                script {
                    sh 'docker build -t $ACR_URL/movies-service:${BUILD_NUMBER} -f services/movies-service/Dockerfile .'
                    
                    // Testy movies service
                    sh 'docker run --rm $ACR_URL/movies-service:${BUILD_NUMBER} sh -c "pip install pytest httpx && pytest"'
                    echo '✅ --- [Movies Service] Testy zakończone sukcesem! ---'
                }
            }
        }

        // --- FRONTEND ---
        stage('Build Frontend') {
            steps {
                script {
                    // Budujemy frontend podając prawdziwe adresy API na Azure
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
                script {
                    echo '🚀 --- [Docker] Wysyłanie obrazów do rejestru ACR ---'
                    
                    // 1. Wypychamy konkretną wersję (BEZPIECZEŃSTWO)
                    sh 'docker push $ACR_URL/auth-service:${BUILD_NUMBER}'
                    sh 'docker push $ACR_URL/movies-service:${BUILD_NUMBER}'
                    sh 'docker push $ACR_URL/frontend:${BUILD_NUMBER}'
                    
                    // 2. Aktualizujemy tag 'latest' (WYGODA DLA DEWELOPERÓW)
                    sh 'docker tag $ACR_URL/auth-service:${BUILD_NUMBER} $ACR_URL/auth-service:latest'
                    sh 'docker push $ACR_URL/auth-service:latest'
                    
                    sh 'docker tag $ACR_URL/movies-service:${BUILD_NUMBER} $ACR_URL/movies-service:latest'
                    sh 'docker push $ACR_URL/movies-service:latest'
                    
                    sh 'docker tag $ACR_URL/frontend:${BUILD_NUMBER} $ACR_URL/frontend:latest'
                    sh 'docker push $ACR_URL/frontend:latest'
                }
            }
        }

        stage('Deploy to Azure Container Apps') {
            steps {
                script {
                    echo '🚀 --- [Azure] Aktualizacja kontenerów (Deploy) ---'
                    // Aktualizujemy obrazy w Azure Container Apps
                    
                    sh "az containerapp update --name auth-service --resource-group $AZURE_RG --image $ACR_URL/auth-service:${BUILD_NUMBER}"
                    sh "az containerapp update --name movies-service --resource-group $AZURE_RG --image $ACR_URL/movies-service:${BUILD_NUMBER}"
                    sh "az containerapp update --name frontend --resource-group $AZURE_RG --image $ACR_URL/frontend:${BUILD_NUMBER}"
                }
            }
        }

        stage('E2E Tests') {
            steps {
                script {
                    echo '🧪 --- [E2E] Uruchamianie testów end-to-end ---'
                    
                    // Czekamy chwilę na pełne wdrożenie aplikacji
                    sh 'sleep 30'
                    
                    // Instalujemy zależności i uruchamiamy testy e2e
                    sh '''
                        cd e2e-tests
                        pip install -r requirements.txt
                        
                        # Instalacja ChromeDriver
                        apt-get update && apt-get install -y wget unzip
                        wget https://chromedriver.storage.googleapis.com/114.0.5735.90/chromedriver_linux64.zip
                        unzip chromedriver_linux64.zip
                        chmod +x chromedriver
                        mv chromedriver /usr/local/bin/
                        
                        # Instalacja Chrome
                        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
                        echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
                        apt-get update && apt-get install -y google-chrome-stable
                        
                        # Uruchomienie testów
                        pytest tests/ -v --tb=short
                    '''
                    
                    echo '✅ --- [E2E] Testy zakończone sukcesem! ---'
                }
            }
        }
    }
}
