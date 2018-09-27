const ts = require('../services/transaction');
const blockchain = require('../services/blockchain');
const log = require('../helpers/logger');
const config = require ('../../config/config.json');


// Module Name
const MODULE_NAME = '[Transaction Controller]';

const accounts = new Map();
const initialEmptyAccount = new ts.TransactionService('0x0', '');
accounts.set('empty', initialEmptyAccount);
const defaultAccount = new ts.TransactionService(config.DefaultAccount,config.DefaultAccountPrivateKey);
accounts.set("default", defaultAccount)
for (var i = 0; i < config.PreLoadedContracts.length; i++) {
  defaultAccount.addContract(config.PreLoadedContracts[i].abi, config.PreLoadedContracts[i].address, config.PreLoadedContracts[i].name);
}

// PUBLIC METHODS

function addAccount(req, res) {
  log.TraceHeadder('addAccount', ['req', ' res'], 'controller');
  const account = new ts.TransactionService(
    req.body.AccountAddress, req.body.AccountPrivateKey,
  );
  accounts.set(req.body.AccountName, account);
  res.json(req.body.AccountAddress);
}

function getAccount(req, res) {
  log.TraceHeadder('getAccount', ['req', ' res'], 'controller');
  const acc = accounts.get(req.swagger.params.id.value);
  if (acc) {
    res.json(acc.AccountAddress);
  }else{
    res.status(404).json({ error : 'Account not found' });
  }
}

function sendTransaction(req, res) {
  log.TraceHeadder('sendTransaction', ['req', ' res'], 'controller');
  try {
    let account = {};
    if (req.body.AccountName) {
        account = accounts.get(req.body.AccountName);
    } else {
        account = accounts.get('default');
    }
    if (account){
        account.executeBLKFunction(req.body.ContractId, req.body.FunctionName, req.body.ParamsArray).then((result) => {
            if (result && result.error === undefined) {
                log.Debug('Returning transaction receipt');
                log.Debug(result);
                res.json(result);
              } else {
                res.status(500).json({ error: 'Error executing function', errormsg: result.error});
              }
        });
    }else{
      res.status(406).json({ error: 'Invalid body', errormsg: 'No account provided and no default account'});
    }
  } catch (err) {
    log.Err(err);
    res.status(500).json({ error: 'Server Error', errormsg: err.message });
  }
}

function sendCall(req, res) {
    log.TraceHeadder('sendCall', ['req', ' res'], 'controller');
    try {
      let account = {};
      if (req.body.AccountName) {
          account = accounts.get(req.body.AccountName);
      } else {
          account = accounts.get('default');
      }
      if (account){
        try{
          account.executeBLKCall(req.body.ContractId, req.body.FunctionName, req.body.ParamsArray).then((result) => {
            if (result && result.error === undefined) {
                log.Debug(`Returning value ${result}`);
                res.json(result);
              } else {
                res.status(500).json({ error: 'Error executing call', errormsg: result.error});
              }
        });
        }catch (err) {
          log.Err(err);
          res.status(500).json({ error: 'Error executing call', errormsg: err});
        }
      }else{
        res.status(406).json({ error: 'Invalid body', errormsg: 'No account provided and no default account'});
      }
    } catch (err) {
      log.Err(err);
      res.status(500).json({ error: 'Server Error', errormsg: err.message });
    }
  }

function addContract(req, res) {
  log.TraceHeadder('addContract', ['req', ' res'], 'controller');
  try {
    let account = {};
    if (req.body.AccountName) {
        account = accounts.get(req.body.AccountName);
    } else {
        account = accounts.get('default');
    }
    if (account) {
        const addr = account.addContract(req.body.abi, req.body.address, req.body.name);
        res.json(addr);
    } else {
      res.status(406).json({ error: 'Invalid body', errormsg: 'No account provided and no default account'});
    }
  } catch (err) {
    log.Err(err);
    res.status(500).json({ error: 'Server Error', errormsg: err.message });
  }
}

function getContract(req, res) {
  try {
    log.TraceHeadder('getContract', ['req', ' res'], 'controller');
    let account = {};
    if (req.body && req.body.AccountName) {
        account = accounts.get(req.body.AccountName);
    } else {
        account = accounts.get('default');
    }
    if (account) {
        const contractName = req.swagger.params.id.value;
        const contractAbi = account.getContract(contractName);
        if(contractAbi){
          res.json({Contract: {abi : contractAbi, address : contractAbi._address, name: contractName}});
        } else {
          res.status(404).json({ error : `Contract ${contractName} not found in address ${account.AccountAddress}`});
        }
    } else {
      res.status(406).json({ error: 'Invalid body', errormsg: 'No account provided and no default account'});
    }
  } catch (err) {
    res.status(500).json({ error: 'Server Error', errormsg: err.message  });
  }
}

function getAllContracts(req, res) {
  try {
    log.TraceHeadder('getAllContracts', ['req', ' res'], 'controller');
    let account = {};
    if (req.body && req.body.AccountName) {
        account = accounts.get(req.body.AccountName);
    } else {
        account = accounts.get('default');
    }
    if (account) {
        const addrs = account.getAllContracts();
        res.json({Contracts: addrs});
    } else {
      res.status(406).json({ error: 'Invalid body', errormsg: 'No account provided and no default account'});
    }
  } catch (err) {
    res.status(500).json({ error: 'Server Error', errormsg: err.message });
  }
}

function checkTxStatus(req, res) {
    log.TraceHeadder('checkTxStatus', ['req', ' res'], 'controller');
      try {
      blockchain.getTransactionReceipt(req.swagger.params.txHash.value).then((result) => {
          if (result && result.error === undefined) {
              log.Debug('Returning transaction receipt');
              log.Debug(result);
              res.json(result);
            } else {
              log.Warn('Tx not in node');
              res.status(404).json({ error: 'Invalid tx hash', errormsg: 'Tx hash not in the node'});
            }
      });
    } catch (err) {
      log.Err(err)
      res.status(500).json({ error: 'Server Error', errormsg: err.message });
    }
  }

module.exports = {
  addAccount,
  getAccount,
  sendTransaction,
  sendCall,
  addContract,
  getContract,
  getAllContracts,
  checkTxStatus,
};
