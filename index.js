#!/usr/bin/env node
'use strict';

var fs = require('fs')
  , path = require('path')
  , config = require('./config.json')
  , WSKey = require('oclc-wskey')
  , NCIP = require('oclc-ncip')
  , parse = require('csv-parse')
  , argv = require('minimist')(process.argv.slice(2))
  ;

var configPath = argv['config']) || argv['c'] || path.join(__dirname, 'config.json');

if ( !fs.statSync(configPath).isFile() ) return console.warn('No config.json file found');

var key = new WSKey(config.wskey.public, config.wskey.secret, {user: config.user})
  , ncip = new NCIP(config.agencyID, key)
  , file = argv._[0]
  , parser = parse()
  , errMode = !!(argv['err'] || argv['e'])
  , checkIn = !!(argv['check-in'])
  , checkOut = !!(argv['check-out'])
  , debug = !!argv['debug']
  , quiet = !!(argv['q'] || argv['quiet'])
  , time = argv['t'] || argv['time'] || 2500
  , record
  ;

return console.log(path.join(__dirname, 'config.json'));

if ( argv['h'] || argv['help'] ) {
  return showHelp();
}

if ( checkIn && checkOut ) {
  return console.warn('Use only --check-in or --check-out, not both!');
}

if ( !checkIn && !checkOut && !debug) {
  return console.warn('Must choose: --check-in, --check-out, or --debug!');
}

fs.readFile(file, function(err, data) {
  if (err) throw err;

  parse(data, {trim: true}, function(err, d) {
    if (err) throw err;
    var i = -1
      , len = d.length
      ;

    var interv = setInterval(function() {
      i++;
      if ( i === len ) return clearInterval(interv);
      var record = d[i]
        , item = record[0]
        , patron = record[1]
        , dueDate = record[2]
        , line = i + 1
        ;


      if ( patron.indexOf(';') > -1 ) {
        var spl = patron.split(';');
        patron = split[spl.length - 1];
        patron = patron.replace(/"/g, '');
      }

      while ( patron.length < 10 ) { patron = '0' + patron; }

      if ( !item ) return console.warn('[LINE %d, ERR] - No item barcode', line);
      if ( !patron && !checkIn ) return console.warn('[LINE %d, ERR] - No item barcode');

      if ( debug ) {
        return console.log('[LINE %d, DEBUG] patron: %s, item: %s, due date: %s', line, patron, item, dueDate);
      }

      if ( checkIn ) {
        return ncip.checkInItem(config.shelvingLoc, item, function(err, resp) {
          if ( !quiet ) {
            if (err) return console.warn('[LINE %d, CHECK-IN ERR] %s', line, err.detail ? err.detail : err );
            else return errMode ? true : console.log('[LINE %d, OK]');
          }
        });
      } else {
        return ncip.checkOutItem(config.shelvingLoc, item, patron, function(err, resp) {
          if ( !quiet ) {
            if (err) return console.warn('[LINE %d, CHECK-OUT ERR] %s', line, err.detail ? err.detail : err);
            else return errMode ? true : console.log('[LINE %d, CHECK-OUT OK]', line)
          }
        });
      }
    }, time);
  });
})

function showHelp() {
  var name = path.basename(process.argv[1]);
  console.log('Batch check in/out items in WMS');
  console.log('Usage: %s [opt] path/to/file.csv', name)
}
