# WMS migration script

Since having 100% of our materials returned while we transitioned from Millennium to WMS was impossible,
we developed a script to receive a .csv file of patron barcodes, item barcodes, and due dates and check 
those items out in WMS. 

# usage

1. Install 

```bash
git clone https://github.com/malantonio/oclc-migration-script
cd oclc-migration-script
```

2. Prep a .csv file, without headers, with three columns:

```
<patron barcode>,<item barcode>,<due date>
```

(Due date column is optional)

3. Copy `config.sample.json` to `config.json` and fill it out

          key        | value
---------------------|-------
`wskey.public`       | WSKey
`wskey.secret`       | secret string attached to WSKey
`user.principalID`   | principalID associated w/ transaction (we're using a fake person)
`user.principalIDNS` | principalIDNS associated w/ transaction
`agencyID`           | the registry ID of your institution
`shelvingLoc`        | the unique ID associated with the branch

4. Use

```
node migrate <flags> data.csv
```

## modes

    flag      | mode
--------------|--------
`--check-in`  | check items in. for this mode, the csv file may contain only item barcodes
`--check-out` | checks items out to patron, optionally takes third row to set due date
`--debug`     | prints the csv to the command line with notes

## flags

         flag            | value
-------------------------|--------
`--time=<ms> | -t <ms>`  | sets the time between transactions (default is 2500ms. anything lower than 500 isn't recommended)
`--config=<path>`        | set a custom path to a `config.json` file
`--quiet | -q`           | set to quiet mode (only logs csv errors)
`--err | -e`             | only displays transactional errors (OK messages ignored)
`--help | -h`            | display the help menu