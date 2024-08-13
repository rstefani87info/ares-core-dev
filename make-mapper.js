#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parsing command line arguments
const argv = yargs(hideBin(process.argv))
  .option('name', {
    alias: 'n',
    description: 'Name of the query',
    type: 'string',
    demandOption: true
  })
  .option('datasourceConfig', {
    alias: 'd',
    description: 'Datasource config name',
    type: 'string',
    demandOption: true
  })
  .option('params', {
    alias: 'p',
    description: 'Parameters in the format name:type:required',
    type: 'string',
    demandOption: true
  })
  .option('queryType', {
    alias: 'q',
    description: 'Query type (sql|url|json|xml|xsl)',
    type: 'string',
    choices: ['sql', 'url', 'json', 'xml', 'xsl'],
    demandOption: true
  })
  .argv;

const queryName = argv.name;
const configName = argv.datasourceConfig;
const params = argv.params.split(',').map(param => {
  const [name, type, required] = param.split(':');
  return { name, type, required: required === 'required' };
});
const queryType = argv.queryType;

// File paths
const queryFilePath = path.join(process.cwd(), `${queryName}.${queryType}`);
const jsFilePath = path.join(process.cwd(), `${queryName}.js`);

// Create query file if not exists
if (!fs.existsSync(queryFilePath)) {
  fs.writeFileSync(queryFilePath, '');
  console.log(`${queryFilePath} created.`);
} else {
  console.log(`${queryFilePath} already exists.`);
}

// Create JS file if not exists
if (!fs.existsSync(jsFilePath)) {
  const jsContent = `import { dataDescriptors } from '@ares/core/dataDescriptors.js';
import {findPropValueByAlias} from '@ares/core/objects.js';

const mapper = [
  {
    connectionSetting: '${configName}', 
    validateParameters: function (req,aReS){
      return {
${params.map(param => 
`        ${param.name}: {...findPropValueByAlias(dataDescriptors, '${param.type}') , required: ${param.required} }`
).join(',\n')}
      };
    },
    mapParameters: function(req, db) {
      return [
${params.map(param => 
`        req.parameters.${param.name}`
).join(',\n')}
      ];
    }
  }
];

export default mapper;
`;

  fs.writeFileSync(jsFilePath, jsContent);
  console.log(`${jsFilePath} created.`);
} else {
  console.log(`${jsFilePath} already exists.`);
}
