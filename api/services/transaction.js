const EthereumTx = require('ethereumjs-tx');

const log = require('../helpers/logger');
const blockchain = require('./blockchain');

/**
  * Create bytecode,
  * @param functionName the name of the functionName to be executed
  * @param functionParamsArray array with the params to execute the functionName
  * @param ABI contrat ABI
  * @param contractAddress contract address
  * @return transaction
  */
async function createTransaction(
  functionName, functionParamsArray, contractInstance, AccountAddress,
) {
  log.TraceHeadder('createTransaction', [functionName, functionParamsArray, contractInstance, AccountAddress]);
  try {
    const bytecode = contractInstance.methods[functionName](...functionParamsArray).encodeABI();
    const gasL = await contractInstance.methods[functionName](...functionParamsArray).estimateGas();
    const nodenonce = await blockchain.getTransactionCount(AccountAddress);
    const contractAddr = contractInstance._address;
    const txParams = {
      from: AccountAddress,
      nonce: nodenonce,
      gasPrice: '0x00',
      gasLimit: gasL,
      to: contractAddr,
      value: '0x00',
      data: bytecode,
    };
    log.Trace('Returning transaction:');
    return txParams;
  } catch (err) {
    log.Err(err);
    return {error: err.message};
  }
}

/**
* Sign the payload data
* @param signed signed payload to be sent
* @return tx hash
*/
function signTransaction(privateKey, transaction, chainId) {
  log.TraceHeadder('signTransaction', [privateKey, transaction, chainId]);
  try {
    const tx = new EthereumTx(transaction, chainId);
    const privKey = Buffer.from(privateKey, 'hex');
    tx.sign(privKey);
    const signedTX = `0x${tx.serialize().toString('hex')}`;
    log.Trace(`Signed transaction: ${signedTX}`);
    return signedTX;
  } catch (err) {
    log.Err(err)
    return { error: err.message}
  }
}

class TransactionService {
  constructor(AccountAddress, AccountPrivateKey, chainId) {
    log.TraceHeadder('TransactionServiceConstructor', [AccountAddress, AccountPrivateKey, chainId]);
    this.AccountAddress = AccountAddress;
    this.AccountPrivateKey = AccountPrivateKey;
    this.chainId = chainId || blockchain.networkVersion;
    this.contractMap = new Map();
  }

  /**
  * Adds contract's to storage
  * @param ABI SC abi
  * @param address where the contract is deployed
  * @param Id Smart contract identifier
  * @return Id
  */
  addContract(ABI, address, Id) {
    log.TraceHeadder('addContract', [ABI, address, Id]);
    try {
      this.contractMap.set(Id, blockchain.getContractInstance(address, ABI));
      log.Debug(`Contract stored, Id: ${Id}`);
      return address;
    } catch (err) {
      log.Err(err);
      return err;
    }
  }

  /**
  * Gets contract's
  * @param ID contrac't ID
  * @return contract
  */
  getContract(Id) {
    log.TraceHeadder('getContract', [Id]);
    try {
      const contract = this.contractMap.get(Id);
      log.Trace(`Contract requested: ${contract}`);
      return contract;
    } catch (err) {
      log.Err(err);
      return err;
    }
  }

  /**
  * Gets all contracts
  * @return contract
  */
  getAllContracts() {
    log.TraceHeadder('getAllContracts', []);
    try {
      log.Trace('All contracts requested');
      return [ ...this.contractMap.keys()];
    } catch (err) {
      log.Err(err);
      return err;
    }
  }

  /**
  * Creates a transaction, signs it and sends it to the node
  * @param contractID Identifier or name of contract
  * @param functionName name of the function to be called
  * @param paramsArray Array with the params that go in the function
  * @return txId
  */
  async executeBLKFunction(contractID, functionName, paramsArray, minedCallBack) {
    log.TraceHeadder('executeBLKFunction', [contractID, functionName, paramsArray]);
    log.Debug(`Executing BLK function: ${functionName}`);
    try {
      const contract = this.contractMap.get(contractID);
      if (contract) {
        const transaction = await createTransaction(
          functionName, paramsArray, contract, this.AccountAddress,
        );
        if (transaction.data) {
          const signedTx = signTransaction(this.AccountPrivateKey, transaction, this.chainId);
          if(!signedTx.error){
            return await blockchain.sendSignedTransaction(signedTx, minedCallBack);
          }
          return {error: signedTx.error};
        }
        return transaction;
      }
      const err = { error: 'Contract name not recognized' };
      log.Err(err);
      return err;
    } catch (err) {
      log.Err(err);
      return {error: err.message};
    }
  }

  /**
  * Encodes a function call, signs its and executes locally on node (does not generate a tx)
  * @param contractID Identifier or name of contract
  * @param functionName name of the function to be called
  * @param paramsArray Array with the params that go in the function
  * @return txId
  */
  async executeBLKCall(contractID, functionName, paramsArray) {
    log.TraceHeadder('executeBLKCall', [contractID, functionName, paramsArray]);
    log.Debug(`Executing BLK call: ${functionName}`);
    try {
      const contract = this.contractMap.get(contractID);
      if (contract) {
        log.Trace('Making call to node');
        const callData = contract.methods[functionName](...paramsArray).encodeABI();
        const res = await blockchain.sendCall({
          to: contract._address,
          data: callData,
        });
        return blockchain.blkInstance.utils.hexToNumberString(res);
      }
      const err = { error: 'Contract name not recognized' };
      log.Err(err);
      return err;
    } catch (err) {
      if (err.message == "contract.methods[functionName] is not a function"){
        return {error: `Function ${functionName} does not exist in contract ${contractID}`}
      } 
      log.Err(err.message);
      return {error: err.message};
    }
  }
}

module.exports = {
  TransactionService,
};
