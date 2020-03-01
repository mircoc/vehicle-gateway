const express = require('express');

const asyncCatcher = require('../../helpers/asyncCatcher');
const {isVehicleConnected} = require('../vehicle');

const router = express.Router();

router.get('/:deviceId', asyncCatcher(async (req, res) => {  
  const deviceId = req.params.deviceId;

  const isConnected = await isVehicleConnected(deviceId);
  if (!isConnected) {
    res.json({offline: true});
    return;
  }

  res.json({fixme: true});
}));


module.exports = router;
