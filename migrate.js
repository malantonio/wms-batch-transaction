'use strict';

// parse opts first
var argv = require('minimist')(process.argv.slice(2), {'boolean': true})
  // modes
  , checkIn = argv['check-in']
  , checkOut = argv['check-out']
  , debug = argv['debug']
  
  // flags
  // --no-color registers in minimist as {color: false}
  , colorMode = argv['color'] !== undefined ? argv['color'] : true
  , errMode = !!(argv['e'] || argv['err'])
  , quiet = !!(argv['q'] || argv['quiet'])
  , time = argv['t'] || argv['time'] || 250
  ;

// before loading everything, let's check for help + errors
if ( argv['h'] || argv['help'] ) return showHelp();
if ( !argv._.length ) return console.warn('Error: No file provided!');
if ( checkIn && checkOut ) return console.warn('Use only --check-in or --check-out, not both!');
if ( !checkIn && !checkOut && !debug) return console.warn('Must choose: --check-in, --check-out, or --debug!');

// check for config file
var fs = require('fs')
  , path = require('path')
  , configPath = argv['config'] || path.join(__dirname, 'config.json')
  , config = require(configPath)
  ;

if ( !fs.statSync(configPath).isFile() ) return console.warn('No config.json file found');

// set up our guts
var WSKey = require('oclc-wskey')
  , NCIP = require('oclc-ncip')
  , parse = require('csv-parse')
  , key = new WSKey(config.wskey.public, config.wskey.secret, {user: config.user})
  , ncip = new NCIP(config.agencyID, key)
  , file = argv._[0]
  , parser = parse()
  , clc
  ;

// set up colorMode business
if ( colorMode ) clc = require('cli-color');
else {
  clc = {};
  
  clc['cyan'] = 
  clc['redBright'] =
  clc['greenBright'] = 
    function(t){return t;}
}

// time to make the :donut:s
fs.readFile(file, function(err, data) {
  if (err) throw err;

  parse(data, { trim: true }, function(err, d) {
    if (err) throw err;
    var i = -1
      , len = d.length
      ;

    var interv = setInterval(function() {
      i++;
      if ( i === len ) return clearInterval(interv);
      var record = d[i]
        , patron = record[0]
        , item = record[1]
        , dueDate = record[2]
        , line = i + 1
        , itemErr = false
        ;


      if ( patron.indexOf(';') > -1 ) {
        var spl = patron.split(';');
        patron = split[spl.length - 1];
        patron = patron.replace(/"/g, '');
      }

      if ( !item ) return console.warn(clc.redBright('[LINE %d, ERR]') + ' - No item barcode', line);
      if ( !patron && !checkIn ) return console.warn(clc.redBright('[LINE %d, ERR]') + ' - No patron barcode');

      if ( debug ) {
        return quiet ? true : console.log(
          clc.cyan('[LINE %d, DEBUG]') + ' patron: %s, item: %s'
            + (dueDate ? ', due date: %s' : ''), 
          line, 
          patron, 
          item, 
          (dueDate ? dueDate : '')
        );
      }

      if ( checkIn ) {
        return ncip.checkInItem(config.shelvingLoc, item, function(err, resp) {
          if ( !quiet ) {
            if (err) {
              if ( err.detail && err.detail.match(/item/i) ) itemErr = true;
              return console.warn(
                      clc.redBright('[LINE %d, CHECK-IN ERR]') + ' %s: ' + ' %s', 
                      line, 
                      itemErr ? item : patron, 
                      err.detail ? err.detail : err
              );
            }
            else return errMode ? true : console.log(clc.greenBright('[LINE %d, OK]'), line);
          }
        });
      } else {
        return ncip.checkOutItem(config.shelvingLoc, item, patron, function(err, resp) {
          if ( !quiet ) {
            if (err) {
              if ( err.detail && err.detail.match(/item/i) ) itemErr = true;
              return console.warn(
                      clc.redBright('[LINE %d, CHECK-OUT ERR]') + ' %s: %s', 
                      line, 
                      itemErr ? item : patron, 
                      err.detail ? err.detail : err
              );
            }
            else return errMode ? true : console.log(clc.greenBright('[LINE %d, CHECK-OUT OK]'), line)
          }
        });
      }
    }, time);
  });
})

function showHelp() {
  var path = path || require('path')
    , name = path.basename(process.argv[1])
    ;

  console.log('Batch check in/out items in WMS');
  console.log('Usage: node %s [opt] path/to/file.csv', name);
  console.log('')
  console.log('OPTIONS');
  console.log('    --check-in | --check-out | --debug   set mode');
  console.log('    --time=<interval> | -t <interval>    frequency of transaction in ms (default is 250)');
  console.log('    --config=<path>                      set path to config.json file');
  console.log('    --quiet | -q                         quiet mode (no transactional feedback)');
  console.log('    --err | -e                           only display transactional errors');
  console.log('    --no-color                           disable color output');
  console.log('    --help | -h                          display this menu');
}
