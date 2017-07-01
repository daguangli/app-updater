const pm2 = require('pm2')
    , unzip = require('unzip')
    , fs = require('fs')
    , del = require('del')
    , async = require('neo-async')
    , debug = require('debug')('app-updater:main')
    , { exec } = require('child_process')

module.exports = function (opts) {

    return function () {

        async.series([
            function (callback) {
                debug('Start clean folder')
                del(['**/*', '!node_modules/**']).then(function (path) {
                    debug('deleted folder:' + path)
                    callback(null, path)
                })
            },
            function (callback) {
                debug('unzipping...')
                fs.createReadStream('../test.zip').pipe(unzip.Extract({ path: '.' }))
                debug('finished unzip')
                callback(null, null)
            },
            function (callback) {
                debug('npm install...')
                exec('npm i', function (err, stdout, stderr) {

                    if (err) {
                        debug(err)
                        callback(err)
                    } else {
                        debug('finished npm install:' + stdout)
                        callback(null, stdout)
                    }
                })
            },
            function (callback) {
                debug('Check if process is running...')
                async.waterfall([
                    function (cb) {
                        exec('pm2 describe test', function (err) {
                            if (err) {
                                cb(null, false)
                            } else {
                                cb(null, true)
                            }
                        })
                    },
                    function (exists, cb) {
                        if (exists) {
                            debug('Start executing: "pm2 reload test"...')
                            exec('pm2 reload test', function (err1, stdout1, stderr1) {
                                if (err1) {
                                    debug('error')
                                    debug(err1)
                                    cb(err1)
                                } else {
                                    debug('Process reloaded successfully' + stdout1)
                                    cb(null, stdout1)
                                }

                            })
                        } else {
                            exec('pm2 start index.js --name test', function (err1, stdout1, stderr1) {
                                if (err1) {
                                    debug(err1)
                                    cb(err1)
                                } else {
                                    debug(stdout1)
                                    cb(null, stdout1)
                                }

                            })
                        }
                    }
                ], function (err, result) {
                    if (err)
                        callback(err)
                    else {
                        callback(null, result)
                    }
                });

            },
        ], function (err, results) {
            debug('Finishing update...')
            if (err) {
                debug('Error updating software:' + err)
                res.send(err.message)
            } else {
                debug('Software update completed successfully!')
                res.send(results[3])
            }
        });
    }
}