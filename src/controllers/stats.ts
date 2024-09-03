import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import {
  calculatePercentage,
  getChartData,
  getInventory,
} from "../utils/features.js";

const adminKeys = [
  "admin-stats",
  "admin-pie-charts",
  "admin-bar-charts",
  "admin-line-charts",
];

export const getDashboardStats = TryCatch(async (req, res, next) => {
  let stats;
  const key = adminKeys[0];
  if (myCache.has(key)) {
    stats = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const thisMonth = {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
    const lastMonth = {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };

    const thisMonthOrdersPromise = await Order.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthOrdersPromise = await Order.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });
    const thisMonthProductsPromise = await Product.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthProductsPromise = await Product.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });

    const thisMonthUsersPromise = await User.find({
      createdAt: {
        $gte: thisMonth.start,
        $lte: thisMonth.end,
      },
    });
    const lastMonthUsersPromise = await User.find({
      createdAt: {
        $gte: lastMonth.start,
        $lte: lastMonth.end,
      },
    });
    const lastSixMonthOrdersPromise = await Order.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    });
    const latestTransactionsPromise = Order.find({})
      .select(["orderItems", "discount", "total", "status"])
      .limit(4);

    const [
      thisMonthOrders,
      thisMonthProducts,
      thisMonthUsers,
      lastMonthOrders,
      lastMonthProducts,
      lastMonthUsers,
      allOrders,
      productsCount,
      usersCount,
      lastSixMonthOrders,
      categories,
      femaleUserCount,
      latestTransactions,
    ] = await Promise.all([
      thisMonthOrdersPromise,
      thisMonthProductsPromise,
      thisMonthUsersPromise,
      lastMonthOrdersPromise,
      lastMonthProductsPromise,
      lastMonthUsersPromise,
      Order.find({}).select("total"),
      Product.countDocuments(),
      User.countDocuments(),
      lastSixMonthOrdersPromise,
      Product.distinct("category"),
      User.countDocuments({ gender: "female" }),
      latestTransactionsPromise,
    ]);

    const thisMonthRevenue = thisMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );
    const lastMonthRevenue = lastMonthOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const changePercent = {
      order: calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      ),
      product: calculatePercentage(
        thisMonthProducts.length,
        lastMonthProducts.length
      ),
      user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
      revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
    };
    const revenue = allOrders.reduce(
      (total, order) => total + (order.total || 0),
      0
    );

    const count = {
      order: allOrders.length,
      product: productsCount,
      user: usersCount,
      revenue,
    };

    const orderMonthCounts = getChartData({
      length: 6,
      today,
      docArr: lastSixMonthOrders,
    });
    const orderMonthlyRevenue = getChartData({
      length: 6,
      today,
      docArr: lastSixMonthOrders,
      property: "total",
    });

    const categoryCount = await getInventory({
      categories,
      productsCount,
    });

    const userRatio = {
      male: usersCount - femaleUserCount,
      femaleUserCount: femaleUserCount,
    };
    const modifiedLatestTransaction = latestTransactions.map((i) => ({
      _id: i._id,
      discount: i.discount,
      amount: i.total,
      quanity: i.orderItems.length,
      status: i.status,
    }));
    stats = {
      categoryCount,
      userRatio,
      latestTransactions: modifiedLatestTransaction,
      changePercent,
      count,
      chart: {
        order: orderMonthCounts,
        revenue: orderMonthlyRevenue,
      },
    };
    myCache.set(key, JSON.stringify(stats));
  }

  return res.status(200).json({
    success: true,
    stats,
  });
});

export const getPie = TryCatch(async (req, res, next) => {
  let charts;
  const key = adminKeys[1];
  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const [
      processingOrder,
      shippedOrder,
      deliveredOrder,
      categories,
      productsCount,
      productsOutOfStock,
      orders,
      users,
      adminUsers,
      customer,
    ] = await Promise.all([
      Order.countDocuments({ status: "Processing" }),
      Order.countDocuments({ status: "Shipped" }),
      Order.countDocuments({ status: "Delivered" }),
      Product.distinct("category"),
      Product.countDocuments(),
      Product.countDocuments({ stock: 0 }),
      Order.find({}).select([
        "total",
        "discount",
        "subtotal",
        "tax",
        "shippingCharges",
      ]),
      User.find({}).select(["dob"]),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "user" }),
    ]);
    const orderFullfillment = {
      processing: processingOrder,
      shipped: shippedOrder,
      delivered: deliveredOrder,
    };
    const productCategories = await getInventory({
      categories,
      productsCount,
    });
    const stockAvailability = {
      inStock: productsCount - productsOutOfStock,
      outOfStock: productsOutOfStock,
    };
    const grossIncome = orders.reduce(
      (prev, order) => prev + (order.total || 0),
      0
    );
    const discount = orders.reduce(
      (prev, order) => prev + (order.discount || 0),
      0
    );
    const productionCost = orders.reduce(
      (prev, order) => prev + (order.shippingCharges || 0),
      0
    );
    const burn = orders.reduce((prev, order) => prev + (order.tax || 0), 0);
    const marketingCost = Math.round(grossIncome * 0.3);
    const netMargin =
      grossIncome - discount - productionCost - burn - marketingCost;
    const revenueDist = {
      netMargin,
      discount,
      productionCost,
      burn,
      marketingCost,
    };
    const adminCustomer = {
      admin: adminUsers,
      customer,
    };
    const userAgeGroup = {
      teen: users.filter((i) => i.age <= 18).length,
      adult: users.filter((i) => i.age > 18 && i.age <= 50).length,
      old: users.filter((i) => i.age > 50).length,
    };
    charts = {
      orderFullfillment,
      productCategories,
      stockAvailability,
      revenueDist,
      adminCustomer,
      userAgeGroup,
    };

    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getBar = TryCatch(async (req, res, next) => {
  let charts;
  const key = adminKeys[2];
  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const lastTwelveMonthOrdersPromise = Order.find({
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    });
    const lastSixMonthProductsPromise = Product.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    });
    const lastSixMonthUsersPromise = User.find({
      createdAt: {
        $gte: sixMonthsAgo,
        $lte: today,
      },
    });

    const [products, users, orders] = await Promise.all([
      lastSixMonthProductsPromise,
      lastSixMonthUsersPromise,
      lastTwelveMonthOrdersPromise,
    ]);

    const productCount = getChartData({ length: 6, today, docArr: products });
    const userCount = getChartData({ length: 6, today, docArr: users });
    const orderCount = getChartData({ length: 12, today, docArr: orders });
    charts = {
      products: productCount,
      users: userCount,
      orders: orderCount,
    };
    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});

export const getLine = TryCatch(async (req, res, next) => {
  let charts;
  const key = adminKeys[3];

  if (myCache.has(key)) {
    charts = JSON.parse(myCache.get(key) as string);
  } else {
    const today = new Date();

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const baseQuery = {
      createdAt: {
        $gte: twelveMonthsAgo,
        $lte: today,
      },
    };

    const [products, users, orders] = await Promise.all([
      Product.find(baseQuery),
      User.find(baseQuery),
      Order.find(baseQuery),
    ]);

    const productCount = getChartData({ length: 12, today, docArr: products });
    const userCount = getChartData({ length: 12, today, docArr: users });
    const discount = getChartData({
      length: 12,
      today,
      docArr: orders,
      property: "discount",
    });
    const revenue = getChartData({
      length: 12,
      today,
      docArr: orders,
      property: "total",
    });
    charts = {
      products: productCount,
      users: userCount,
      discount,
      revenue,
    };
    myCache.set(key, JSON.stringify(charts));
  }
  return res.status(200).json({
    success: true,
    charts,
  });
});
