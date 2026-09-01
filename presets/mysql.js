import { MariaDB } from "@ares/datasource-mysql";

export const DRIVER_NAME = "mysql";

export function buildDatasourceModule({ name, host, user, password, database, port }) {
  const db = JSON.stringify(database || name);
  const envBlock = `{
		${JSON.stringify(host || "localhost")}:{
			host: ${JSON.stringify(host || "localhost")},
			port: ${JSON.stringify(port || 3306)},
			user: ${JSON.stringify(user || "root")},
			password: ${JSON.stringify(password ?? "")},
			database: ${JSON.stringify(database || name)},
			driver: MariaDB,
			multipleStatements: true,
			queryExtensions:['sql'],
		}
	}`;
  return `import {MariaDB} from '@ares/datasource-mysql';
export const name = ${JSON.stringify(name)};
export const environments = {
	test : ${envBlock},
	production : ${envBlock}
};
`;
}

export function buildDefaultSchemasJson({ schemaName }) {
  return {
    timestamp: Date.now(),
    reverseEngineeringCapabilities: {
      schemas: true,
      entities: true,
      properties: true,
      indexes: true,
    },
    schemaDefinitions: [
      {
        name: schemaName,
        entities: [],
      },
    ],
  };
}

export default {
  DRIVER_NAME,
  buildDatasourceModule,
  buildDefaultSchemasJson,
};
