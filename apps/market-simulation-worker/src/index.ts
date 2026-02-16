import prisma from "@repo/db"
import redisclient from '@repo/redisclient'
import Decimal from "decimal.js"

const BACKEND_URL = 'http://localhost:3001'

const Users = [
    `marketmaker1-${Date.now()}`,
    `marketmaker2-${Date.now()}`,
    `trader1-${Date.now()}`,
    `trader2-${Date.now()}`,
    `trader3-${Date.now()}`,
    `scalper1-${Date.now()}`,
    `scalper2-${Date.now()}`,
    `whale1-${Date.now()}`,
    `arbitrage1-${Date.now()}`,
    `retail1-${Date.now()}`,
]

const TEST_BASE_ASSET = "ETH"
const TEST_QUOTE_ASSET = "USDC"

const jitter = Math.random() * 1000;

// Market state
let currentPrice = new Decimal(50.10); // Starting SOL price
let priceVolatility = 0.02; // 2% volatility
let spreadBps = 10; // 10 basis points spread (0.1%)

interface UserProfile {
    jwt: string;
    type: 'market_maker' | 'trader' | 'scalper' | 'whale' | 'arbitrage' | 'retail';
    capital: Decimal;
}

const userProfiles = new Map<string, UserProfile>();

const createUsers = async () => {
    const users = await Promise.all(Users.map(async (user) => {
        return await prisma.user.create({
            data: {
                email: `${user}@example.com`,
            },
        })
    }))
    return users;
}

const fillUserWalletForTestAssets = async (jwt: string, baseAmount: number, quoteAmount: number) => {
    await fetch(`${BACKEND_URL}/wallets/deposit`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({
            asset: TEST_BASE_ASSET,
            amount: baseAmount,
        }),
    })
    await fetch(`${BACKEND_URL}/wallets/deposit`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({
            asset: TEST_QUOTE_ASSET,
            amount: quoteAmount,
        }),
    })
}

const getJWTToken = async (user: { id: string, email: string }) => {
    await fetch(`${BACKEND_URL}/auth/request-otp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: user.email,
        }),
    })
    await new Promise((res) => setTimeout(res, 1000));

    const otp = await redisclient.get(`OTP:${user.id}`)

    const response2 = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            otp,
            email: user.email,
        }),
    })
    const data2: any = await response2.json()
    return data2.jwt
}

const placeOrder = async (
    jwt: string,
    side: "BUY" | "SELL",
    price: Decimal,
    quantity: Decimal,
    type: "LIMIT" | "MARKET" = "LIMIT"
) => {
    try {
        const response = await fetch(`${BACKEND_URL}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwt}`,
            },
            body: JSON.stringify({
                pair: `${TEST_BASE_ASSET}-${TEST_QUOTE_ASSET}`,
                side,
                type,
                price: type === "LIMIT" ? price.toDecimalPlaces(2).toString() : undefined,
                quantity: quantity.toDecimalPlaces(4).toString(),
            }),
        })
        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error placing order:", error)
        return null
    }
}

// Simulate price movement with mean reversion
const updateMarketPrice = () => {
    // Random walk with mean reversion to 150
    const meanReversionStrength = 0.05;
    const randomChange = (Math.random() - 0.5) * 2 * priceVolatility;
    const meanReversion = (new Decimal(150).sub(currentPrice)).mul(meanReversionStrength);

    const priceChange = currentPrice.mul(randomChange).add(meanReversion);
    currentPrice = currentPrice.add(priceChange);

    // Keep price in reasonable range
    if (currentPrice.lt(100)) currentPrice = new Decimal(100);
    if (currentPrice.gt(200)) currentPrice = new Decimal(200);
}

// Market maker behavior - provides liquidity on both sides
const marketMakerStrategy = async (profile: UserProfile) => {
    const spreadSize = currentPrice.mul(spreadBps / 10000);
    const bidPrice = currentPrice.sub(spreadSize);
    const askPrice = currentPrice.add(spreadSize);

    // Place multiple orders at different levels
    const levels = 5;
    const quantityPerLevel = new Decimal(Math.random() * 5 + 2); // 2-7 SOL per level

    const promises = [];

    for (let i = 0; i < levels; i++) {
        const priceStep = spreadSize.mul(i * 0.5);

        promises.push(placeOrder(
            profile.jwt,
            "BUY",
            bidPrice.sub(priceStep),
            quantityPerLevel.mul(1 + i * 0.2)
        ), placeOrder(
            profile.jwt,
            "SELL",
            askPrice.add(priceStep),
            quantityPerLevel.mul(1 + i * 0.2)
        ))
    }

    await Promise.all(promises);
}

// Trader behavior - takes directional positions
const traderStrategy = async (profile: UserProfile) => {
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    const quantity = new Decimal(Math.random() * 10 + 1); // 1-11 SOL

    // Sometimes market order, sometimes limit near current price
    if (Math.random() > 0.7) {
        await placeOrder(profile.jwt, side, currentPrice, quantity, "MARKET");
    } else {
        const priceOffset = currentPrice.mul((Math.random() - 0.5) * 0.005); // ±0.5%
        await placeOrder(profile.jwt, side, currentPrice.add(priceOffset), quantity);
    }
}

// Scalper behavior - small quick trades
const scalperStrategy = async (profile: UserProfile) => {
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    const quantity = new Decimal(Math.random() * 2 + 0.5); // 0.5-2.5 SOL
    const tightSpread = currentPrice.mul(0.0005); // 0.05% from mid

    const price = side === "BUY"
        ? currentPrice.sub(tightSpread)
        : currentPrice.add(tightSpread);

    await placeOrder(profile.jwt, side, price, quantity);
}

// Whale behavior - large infrequent orders
const whaleStrategy = async (profile: UserProfile) => {
    if (Math.random() > 0.9) { // Only 10% of the time
        const side = Math.random() > 0.5 ? "BUY" : "SELL";
        const quantity = new Decimal(Math.random() * 50 + 20); // 20-70 SOL
        const priceOffset = currentPrice.mul((Math.random() - 0.5) * 0.01); // ±1%

        await placeOrder(profile.jwt, side, currentPrice.add(priceOffset), quantity);
    }
}

// Arbitrage behavior - places orders on both sides
const arbitrageStrategy = async (profile: UserProfile) => {
    const quantity = new Decimal(Math.random() * 5 + 2); // 2-7 SOL
    const offset = currentPrice.mul(0.003); // 0.3% spread

    // Place both buy and sell to capture spread
    await placeOrder(profile.jwt, "BUY", currentPrice.sub(offset), quantity);
    await placeOrder(profile.jwt, "SELL", currentPrice.add(offset), quantity);
}

// Retail behavior - random small orders
const retailStrategy = async (profile: UserProfile) => {
    const side = Math.random() > 0.5 ? "BUY" : "SELL";
    const quantity = new Decimal(Math.random() * 3 + 0.1); // 0.1-3.1 SOL
    const priceOffset = currentPrice.mul((Math.random() - 0.5) * 0.02); // ±2%

    await placeOrder(profile.jwt, side, currentPrice.add(priceOffset), quantity);
}

const executeStrategy = async (profile: UserProfile) => {
    try {
        switch (profile.type) {
            case 'market_maker':
                await marketMakerStrategy(profile);
                break;
            case 'trader':
                await traderStrategy(profile);
                break;
            case 'scalper':
                await scalperStrategy(profile);
                break;
            case 'whale':
                await whaleStrategy(profile);
                break;
            case 'arbitrage':
                await arbitrageStrategy(profile);
                break;
            case 'retail':
                await retailStrategy(profile);
                break;
        }
    } catch (error) {
        console.error(`Error executing ${profile.type} strategy:`, error);
    }
}

async function main() {
    console.log("Creating users...");
    const users = await createUsers();

    console.log("Getting JWT tokens...");
    for (let i = 0; i < users.length; i++) {
        const user = users[i]!;
        const jwt = await getJWTToken(user);

        let type: UserProfile['type'];
        let baseAmount: number;
        let quoteAmount: number;

        if (i < 2) {
            type = 'market_maker';
            baseAmount = 10000;
            quoteAmount = 1500000;
        } else if (i < 5) {
            type = 'trader';
            baseAmount = 1000;
            quoteAmount = 150000;
        } else if (i < 7) {
            type = 'scalper';
            baseAmount = 500;
            quoteAmount = 75000;
        } else if (i === 7) {
            type = 'whale';
            baseAmount = 50000;
            quoteAmount = 7500000;
        } else if (i === 8) {
            type = 'arbitrage';
            baseAmount = 5000;
            quoteAmount = 750000;
        } else {
            type = 'retail';
            baseAmount = 100;
            quoteAmount = 15000;
        }

        await fillUserWalletForTestAssets(jwt, baseAmount, quoteAmount);

        userProfiles.set(user!.id, {
            jwt,
            type,
            capital: new Decimal(quoteAmount)
        });

        console.log(`Created ${type} user: ${user!.email}`);
    }

    console.log("Starting market simulation...");

    // Update price every 5 seconds
    setInterval(() => {
        updateMarketPrice();
        console.log(`Current market price: $${currentPrice.toFixed(2)}`);
    }, 5000);

    // Market makers update frequently
    userProfiles.forEach((profile, userId) => {
        if (profile.type === 'market_maker') {
            setInterval(() => executeStrategy(profile), 3000 + jitter);
        }
    });

    // Scalpers trade frequently
    userProfiles.forEach((profile) => {
        if (profile.type === 'scalper') {
            setInterval(() => executeStrategy(profile), 2000 + jitter);
        }
    });

    // Traders trade moderately
    userProfiles.forEach((profile) => {
        if (profile.type === 'trader') {
            setInterval(() => executeStrategy(profile), 5000 + jitter);
        }
    });

    // Arbitrage bots trade frequently
    userProfiles.forEach((profile) => {
        if (profile.type === 'arbitrage') {
            setInterval(() => executeStrategy(profile), 4000 + jitter);
        }
    });

    // Whales trade infrequently
    userProfiles.forEach((profile) => {
        if (profile.type === 'whale') {
            setInterval(() => executeStrategy(profile), 30000 + jitter);
        }
    });

    // Retail traders trade occasionally
    userProfiles.forEach((profile) => {
        if (profile.type === 'retail') {
            setInterval(() => executeStrategy(profile), 8000 + jitter);
        }
    });

    console.log("Market simulation running...");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});