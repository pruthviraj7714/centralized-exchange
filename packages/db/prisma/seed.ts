import { SEED_MARKETS } from "@repo/common";
import prisma from "..";

async function main() {
  console.log("Starting TimescaleDB setup...");

  try {
    await prisma.market.deleteMany({});
    await prisma.market.createMany({
      data: SEED_MARKETS.map((m) => {
        return {
          ticker: m.ticker,
          baseAsset: m.baseAsset,
          quoteAsset: m.quoteAsset,
          sparkline7d: [],
          logo: m.logo,
          symbol: m.symbol,
          price: 0,
        };
      }),
    });
    console.log("markets successfully seeded into db");
    console.log("Creating TimescaleDB extension...");
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS timescaledb;`;

    console.log("Creating hypertable for Trade table...");
    await prisma.$executeRaw`SELECT create_hypertable('"Trade"', 'executedAt', if_not_exists => TRUE);`;

    // ------------------------------------------------------
    // 1m candles
    // ------------------------------------------------------
    console.log("Setting up 1m candles materialized view...");
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS candle_1m CASCADE;`;

    await prisma.$executeRaw`
      CREATE MATERIALIZED VIEW candle_1m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 minute', "executedAt") AS bucket,
        pair,
        first(price, "executedAt") AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, "executedAt") AS close,
        count(*) AS trades
      FROM "Trade"
      GROUP BY bucket, pair
      WITH NO DATA;
    `;

    await prisma.$executeRaw`
      SELECT add_continuous_aggregate_policy('candle_1m',
          start_offset => INTERVAL '7 days',
          end_offset   => INTERVAL '1 minute',
          schedule_interval => INTERVAL '1 minute');
    `;

    // ------------------------------------------------------
    // 5m candles
    // ------------------------------------------------------
    console.log("Setting up 5m candles materialized view...");
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS candle_5m CASCADE;`;

    await prisma.$executeRaw`
      CREATE MATERIALIZED VIEW candle_5m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('5 minutes', "executedAt") AS bucket,
        pair,
        first(price, "executedAt") AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, "executedAt") AS close,
        count(*) AS trades
      FROM "Trade"
      GROUP BY bucket, pair
      WITH NO DATA;
    `;

    await prisma.$executeRaw`
      SELECT add_continuous_aggregate_policy('candle_5m',
          start_offset => INTERVAL '7 days',
          end_offset   => INTERVAL '5 minutes',
          schedule_interval => INTERVAL '5 minutes');
    `;

    // ------------------------------------------------------
    // 15m candles
    // ------------------------------------------------------
    console.log("Setting up 15m candles materialized view...");
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS candle_15m CASCADE;`;

    await prisma.$executeRaw`
      CREATE MATERIALIZED VIEW candle_15m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('15 minutes', "executedAt") AS bucket,
        pair,
        first(price, "executedAt") AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, "executedAt") AS close,
        count(*) AS trades
      FROM "Trade"
      GROUP BY bucket, pair
      WITH NO DATA;
    `;

    await prisma.$executeRaw`
      SELECT add_continuous_aggregate_policy('candle_15m',
          start_offset => INTERVAL '14 days',
          end_offset   => INTERVAL '15 minutes',
          schedule_interval => INTERVAL '15 minutes');
    `;

    // ------------------------------------------------------
    // 30m candles
    // ------------------------------------------------------
    console.log("Setting up 30m candles materialized view...");
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS candle_30m CASCADE;`;

    await prisma.$executeRaw`
      CREATE MATERIALIZED VIEW candle_30m
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('30 minutes', "executedAt") AS bucket,
        pair,
        first(price, "executedAt") AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, "executedAt") AS close,
        count(*) AS trades
      FROM "Trade"
      GROUP BY bucket, pair
      WITH NO DATA;
    `;

    await prisma.$executeRaw`
      SELECT add_continuous_aggregate_policy('candle_30m',
          start_offset => INTERVAL '14 days',
          end_offset   => INTERVAL '30 minutes',
          schedule_interval => INTERVAL '30 minutes');
    `;

    // ------------------------------------------------------
    // 1h candles
    // ------------------------------------------------------
    console.log("Setting up 1h candles materialized view...");
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS candle_1h CASCADE;`;

    await prisma.$executeRaw`
      CREATE MATERIALIZED VIEW candle_1h
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 hour', "executedAt") AS bucket,
        pair,
        first(price, "executedAt") AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, "executedAt") AS close,
        count(*) AS trades
      FROM "Trade"
      GROUP BY bucket, pair
      WITH NO DATA;
    `;

    await prisma.$executeRaw`
      SELECT add_continuous_aggregate_policy('candle_1h',
          start_offset => INTERVAL '30 days',
          end_offset   => INTERVAL '1 hour',
          schedule_interval => INTERVAL '1 hour');
    `;

    // ------------------------------------------------------
    // 4h candles
    // ------------------------------------------------------
    console.log("Setting up 4h candles materialized view...");
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS candle_4h CASCADE;`;

    await prisma.$executeRaw`
      CREATE MATERIALIZED VIEW candle_4h
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('4 hours', "executedAt") AS bucket,
        pair,
        first(price, "executedAt") AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, "executedAt") AS close,
        count(*) AS trades
      FROM "Trade"
      GROUP BY bucket, pair
      WITH NO DATA;
    `;

    await prisma.$executeRaw`
      SELECT add_continuous_aggregate_policy('candle_4h',
          start_offset => INTERVAL '90 days',
          end_offset   => INTERVAL '4 hours',
          schedule_interval => INTERVAL '4 hours');
    `;

    // ------------------------------------------------------
    // 1d candles
    // ------------------------------------------------------
    console.log("Setting up 1d candles materialized view...");
    await prisma.$executeRaw`DROP MATERIALIZED VIEW IF EXISTS candle_1d CASCADE;`;

    await prisma.$executeRaw`
      CREATE MATERIALIZED VIEW candle_1d
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket('1 day', "executedAt") AS bucket,
        pair,
        first(price, "executedAt") AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, "executedAt") AS close,
        count(*) AS trades
      FROM "Trade"
      GROUP BY bucket, pair
      WITH NO DATA;
    `;

    await prisma.$executeRaw`
      SELECT add_continuous_aggregate_policy('candle_1d',
          start_offset => INTERVAL '365 days',
          end_offset   => INTERVAL '1 day',
          schedule_interval => INTERVAL '1 day');
    `;

    console.log("✅ TimescaleDB setup completed successfully!");
    console.log(
      "Created materialized views: candle_1m, candle_5m, candle_15m, candle_30m, candle_1h, candle_4h, candle_1d"
    );
  } catch (error) {
    console.error("❌ Error during TimescaleDB setup:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database connection closed.");
  })
  .catch(async (e) => {
    console.error("Fatal error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
