ENV=$1
docker buildx build --platform linux/amd64 --push \
  --build-arg="CONFIG_ENV=$ENV" -t europe-west6-docker.pkg.dev/aion-393717/chnopfdruck/$ENV:latest .

source server/mobile-server/.env

gcloud run deploy $ENV \
  --set-env-vars=OPENAI_API_MODEL=$OPENAI_API_MODEL,MQTT_ENABLED=false,SPEECH_REGION=$SPEECH_REGION,SPEECH_API=$SPEECH_API,OPENAI_API_KEY=$OPENAI_API_KEY \
  --image europe-west6-docker.pkg.dev/aion-393717/chnopfdruck/$ENV:latest --region europe-west6 --project aion-393717

