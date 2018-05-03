
export FABRIC_CFG_PATH=$PWD
cryptogen generate --config=./cryptogen.yaml
configtxgen -profile ThreeOrgsOrdererGenesis -outputBlock ./genesis.block
configtxgen -profile ThreeOrgsChannel -outputCreateChannelTx ./channel.tx -channelID agelichannel
configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./AgeliMSPanchors.tx -channelID agelichannel -asOrg AgeliMSP
configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./CreatorMSPanchors.tx -channelID agelichannel -asOrg CreatorMSP
configtxgen -profile ThreeOrgsChannel -outputAnchorPeersUpdate ./TransferMSPanchors.tx -channelID agelichannel -asOrg TransferMSP

IMAGE_TAG=latest CHANNEL_NAME=fieldleechannel TIMEOUT=10 DELAY=3 docker-compose -f docker-compose-cli.yaml up -d

configtxgen -printOrg SellerMSP > ../channel-artifacts/seller.json

