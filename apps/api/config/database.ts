import app from '@adonisjs/core/services/app';
import { defineConfig } from '@adonisjs/lucid';
import env from '#start/env';

const dbConfig = defineConfig({
  prettyPrintDebugQueries: app.inDev,
  /**
   * Default connection used for all queries.
   */
  connection: 'mysql',

  connections: {
    /**
     * MySQL / MariaDB connection (default).
     * Install package to switch: npm install mysql2
     */
    mysql: {
      client: 'mysql2',
      connection: {
        host: env.get('DB_MYSQL_HOST'),
        port: env.get('DB_MYSQL_PORT'),
        user: env.get('DB_MYSQL_USER'),
        password: env.get('DB_MYSQL_PASSWORD'),
        database: env.get('DB_MYSQL_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev,
      pool: { min: 5, max: 16 },
    },
    /**
     * SQLite connection.
     */
    sqlite: {
      client: 'better-sqlite3',

      connection: {
        filename: app.tmpPath('db.sqlite3'),
      },

      /**
       * Required by Knex for SQLite defaults.
       */
      useNullAsDefault: true,

      migrations: {
        /**
         * Sort migration files naturally by filename.
         */
        naturalSort: true,

        /**
         * Paths containing migration files.
         */
        paths: ['database/migrations'],
      },

      schemaGeneration: {
        /**
         * Enable schema generation from Lucid models.
         */
        enabled: true,

        /**
         * Custom schema rules file paths.
         */
        rulesPaths: ['./database/schema-rules.js'],
      },
    },

    /**
     * PostgreSQL connection.
     * Install package to switch: npm install pg
     */
    pg: {
      client: 'pg',
      connection: {
        host: process.env.PG_HOST,
        port: Number(process.env.PG_PORT || 5432),
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DB_NAME,
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev,
    },
  },
});

export default dbConfig;
