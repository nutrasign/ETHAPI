const Web3 = require('web3');
const log = require('../helpers/logger');

const config = require('../../config/config.json');

// Instancia de web3, todas las funciones de web3 se pueden acceder desde aquí
const blkInstance = new Web3(new Web3.providers.HttpProvider(config.RPCConnectionURI));

const networkVersion = blkInstance.version.network;


/**
  * Gets number of transactions made by the account
  * @param address address to check
  * @param option type of transactions to count (default includes pending)
  * @return signed bytecode to SendRawTransaction
  */
function getTransactionCount(address, option) {
  log.TraceHeadder('getTransactionCount', [address, option]);
  return blkInstance.eth.getTransactionCount(address, option || 'pending');
}

/**
  * Gets the transactions receipt information
  * @param txHash transaction hash
  * @return receipt info object
  */
function getTransactionReceipt(txHash) {
  return blkInstance.eth.getTransactionReceipt(txHash);
}

/**
  * Creates instance of contract
  * @param address where contract is deployed
  * @param abi contract's ABI
  * @return signed bytecode to SendRawTransaction
  */
function getContractInstance(address, abi) {
  log.TraceHeadder('getContractInstance', [address, abi]);
  return new blkInstance.eth.Contract(abi, address);
}


/**
  * Gets address where contract has been deployed
  * @param contract compiled contract used for deployment
  * @param netVersion (Optional) blockchain version to check
  * @return Latest address where the contract was deployed
  */
function getLatestAddress(contract, netVersion) {
  const { address } = contract.networks[netVersion || this.web3.version.network];
  if (address === undefined || /0x([a-z0-9]{40,})$/.test(address)) {
    throw new Error('contract address not found for');
  }
  return address;
}


/**
  * Sends a signed transaction
  * @param signedTx Signed transaction to be sent
  * @param minedCallBack (optional) callback to be executed when the transaction is confirmed
  * @return promise that solves to a transaction hash
  */
function sendSignedTransaction(signedTx, minedCallBack) {
  log.TraceHeadder('sendSignedTransaction', [signedTx]);
  try {
    return blkInstance.eth.sendSignedTransaction(signedTx).on('transactionHash', (txHash) => {
      log.Debug(`Tx hash is ${txHash}`);
    }).once('receipt', (receipt) => {
      log.Debug('Tx reached node');
      log.Trace(`Tx ${receipt.transactionHash}`);
    }).once('confirmation', (confirmationNumber, receipt) => {
      log.Trace(`Tx ${receipt.transactionHash} mined`);
      if (minedCallBack) {
        minedCallBack(receipt);
      }
    })
      .on('error', (err) => {
        log.Err(err);
        if (minedCallBack) {
          minedCallBack(err);
        }
      });
  } catch (err) {
    log.Err(err);
    return err;
  }
}

/**
  * Sends a transaction call to the node
  * @param tx transaction to be sent
  * @return promise that solves to node's response
  */
function sendCall(tx) {
  log.TraceHeadder('sendCall', [tx]);
  try {
    return blkInstance.eth.call(tx);
  } catch (err) {
    log.Err(err);
    return err;
  }
}

module.exports = {
  blkInstance,
  networkVersion,
  getTransactionCount,
  sendSignedTransaction,
  sendCall,
  getLatestAddress,
  getTransactionReceipt,
  getContractInstance,
};
