#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

jq --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "Please Install 'jq' https://stedolan.github.io/jq/ to execute this script"
	echo
	exit 1
fi

starttime=$(date +%s)

# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  ./testHalalAPIs.sh -l golang|node"
  echo "    -l <language> - chaincode language (defaults to \"golang\")"
}
# Language defaults to "golang"
LANGUAGE="golang"

# Parse commandline args
while getopts "h?l:" opt; do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    l)  LANGUAGE=$OPTARG
    ;;
  esac
done

##set chaincode path
function setChaincodePath(){
	LANGUAGE=`echo "$LANGUAGE" | tr '[:upper:]' '[:lower:]'`
	case "$LANGUAGE" in
		"golang")
#		CC_SRC_PATH="github.com/example_cc/go"
        CC_SRC_PATH="hlccc"
		;;
		"node")
		CC_SRC_PATH="$PWD/chaincode/src/github.com/example_cc/node"
		;;
		*) printf "\n ------ Language $LANGUAGE is not supported yet ------\n"$
		exit 1
	esac
}

setChaincodePath

echo "POST request Enroll on Org1  ..."
echo
ORG1_TOKEN=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
	"username":"grapebaba1",
	"password":"ageli2018",
	"orgName": "Ageli"
}')
echo $ORG1_TOKEN
ORG1_TOKEN=$(echo $ORG1_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG1 token is $ORG1_TOKEN"
echo
echo "POST request Enroll on Org2 ..."
echo
ORG2_TOKEN=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
	"username":"grapebaba2",
	"password":"ageli2018",
	"orgName": "Creator"
}')
echo $ORG2_TOKEN
ORG2_TOKEN=$(echo $ORG2_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG2 token is $ORG2_TOKEN"
echo
echo "POST request Enroll on Org3  ..."
echo
ORG3_TOKEN=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
	"username":"grapebaba3",
	"password":"ageli2018",
	"orgName": "Transfer"
}')
echo $ORG3_TOKEN
ORG3_TOKEN=$(echo $ORG3_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG3 token is $ORG3_TOKEN"
echo
echo "POST request Enroll on Org4  ..."
echo
ORG4_TOKEN=$(curl -s -X POST \
  http://localhost:4000/login \
  -H "content-type: application/json" \
  -d '{
	"username":"grapebaba4",
	"password":"ageli2018",
	"orgName": "Seller"
}')
echo $ORG4_TOKEN
ORG4_TOKEN=$(echo $ORG4_TOKEN | jq ".token" | sed "s/\"//g")
echo
echo "ORG4 token is $ORG4_TOKEN"
echo
echo

echo "POST Install chaincode on Org1"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.ageli.com\",\"peer1.ageli.com\"],
	\"chaincodeName\":\"hlccc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v2.8\"
}"
echo
echo

echo "POST Install chaincode on Org2"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $ORG2_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.creator.com\",\"peer1.creator.com\"],
	\"chaincodeName\":\"hlccc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v2.8\"
}"
echo
echo

echo "POST Install chaincode on Org3"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $ORG3_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.transfer.com\",\"peer1.transfer.com\"],
	\"chaincodeName\":\"hlccc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v2.8\"
}"
echo
echo


echo "POST Install chaincode on Org4"
echo
curl -s -X POST \
  http://localhost:4000/chaincodes \
  -H "authorization: Bearer $ORG4_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peers\": [\"peer0.seller.com\",\"peer1.seller.com\"],
	\"chaincodeName\":\"hlccc\",
	\"chaincodePath\":\"$CC_SRC_PATH\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"chaincodeVersion\":\"v2.8\"
}"
echo
echo



echo "POST UPDATE chaincode on Org1"
echo
curl -s -X PUT \
  http://localhost:4000/channels/mychannel/chaincodes \
  -H "authorization: Bearer $ORG1_TOKEN" \
  -H "content-type: application/json" \
  -d "{
	\"peer\": \"peer0.ageli.com\",
	\"chaincodeName\":\"hlccc\",
	\"chaincodeType\": \"$LANGUAGE\",
	\"fcn\":\"init\",
  \"args\":[\"\"],
	\"chaincodeVersion\":\"v2.8\"
}"
echo
echo



echo "Total execution time : $(($(date +%s)-starttime)) secs ..."
