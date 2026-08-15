(function installPresentationSchema(root) {
  "use strict";

  const deepFreeze = (value) => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const schema = {
    version: 1,
    fields: {
      account: { role: "identifier", width: "standard", align: "left" },
      symbol: { role: "identifier", width: "standard", align: "left" },
      quantity: { role: "quantity", width: "compact", align: "right" },
      expiration: { role: "date", width: "medium", align: "left" },
      date: { role: "date", width: "medium", align: "left" },
      strike: { role: "currency", width: "medium", align: "right" },
      stockPrice: { role: "currency", width: "medium", align: "right" },
      optionPrice: { role: "currency", width: "medium", align: "right" },
      limitPrice: { role: "currency", width: "medium", align: "right" },
      delta: { role: "decimal", width: "compact", align: "right" },
      dte: { role: "duration", width: "compact", align: "right" },
      percentage: { role: "percentage", width: "medium", align: "right" },
      score: { role: "score", width: "compact", align: "right" },
      status: { role: "status", width: "standard", align: "left" },
      source: { role: "source", width: "standard", align: "left" },
      narrative: { role: "narrative", width: "wide", align: "left", resizable: true, minWidth: 180, maxWidth: 720 },
      instructions: { role: "instructions", width: "wide", align: "left", resizable: true, minWidth: 180, maxWidth: 720 },
      orderNumber: { role: "identifier", width: "standard", align: "left" },
      orderType: { role: "status", width: "standard", align: "left" },
      contract: { role: "contract", width: "roomy", align: "left" },
      rank: { role: "rank", width: "compact", align: "right" },
      bucket: { role: "category", width: "standard", align: "left" },
      text: { role: "text", width: "standard", align: "left" },
      boolean: { role: "boolean", width: "compact", align: "left" },
      month: { role: "date", width: "medium", align: "left" },
      threshold: { role: "threshold", width: "roomy", align: "left" },
      setting: { role: "setting", width: "roomy", align: "left" },
      value: { role: "value", width: "wide", align: "left" },
    },
    views: {
      coveredCalls: {
        columns: [
          { field: "symbol", label: "Symbol" },
          { field: "quantity", key: "contracts", label: "Qty" },
          { field: "expiration", label: "Expiration" },
          { field: "strike", label: "Strike" },
          { field: "stockPrice", key: "current_price", label: "Stock" },
          { field: "delta", label: "Delta" },
          { field: "dte", label: "DTE" },
          { field: "percentage", key: "distance_to_strike_pct", label: "Distance" },
          { field: "score", key: "risk_score", label: "Risk" },
          { field: "status", label: "Status" },
          { field: "narrative", key: "action", label: "Action" },
          { field: "instructions", key: "trade_instructions", label: "Trade Instructions" },
          { field: "source", key: "quote_source", label: "Sources" },
        ],
      },
      openOrders: {
        columns: [
          { field: "orderNumber", key: "order_id", label: "Order" },
          { field: "date", key: "entered_at", label: "Entered" },
          { field: "status", label: "Status" },
          { field: "orderType", key: "strategy", label: "Strategy" },
          { field: "symbol", label: "Symbol" },
          { field: "quantity", key: "contracts", label: "Qty" },
          { field: "instructions", key: "legs", label: "Option Legs" },
          { field: "limitPrice", key: "limit_price", label: "Submitted Limit" },
          { field: "text", key: "duration", label: "Duration" },
        ],
      },
      weeklyOpportunities: {
        columns: [
          { field: "date", label: "Quote date" }, { field: "date", label: "Planned entry" },
          { field: "expiration", label: "Expiration" }, { field: "quantity", label: "Qty" },
          { field: "bucket", label: "Bucket" }, { field: "strike", label: "Strike" },
          { field: "delta", label: "Delta" }, { field: "optionPrice", label: "Bid/share" },
          { field: "optionPrice", label: "Expected premium" }, { field: "percentage", label: "Spread" },
          { field: "score", label: "Score" }, { field: "status", label: "Risk" },
        ],
      },
      recommendations: {
        columns: [
          { field: "bucket", label: "Bucket" }, { field: "quantity", label: "Qty" },
          { field: "expiration", label: "Expiration" }, { field: "dte", label: "DTE" },
          { field: "strike", label: "Strike" }, { field: "delta", label: "Delta" },
          { field: "optionPrice", label: "Bid" }, { field: "optionPrice", label: "Expected premium" },
          { field: "percentage", label: "Spread" }, { field: "score", label: "Recommendation score" },
          { field: "status", label: "Risk level" }, { field: "narrative", label: "Why" },
        ],
      },
      recommendationCadence: {
        columns: [
          { field: "date", label: "Review / potential execution" }, { field: "expiration", label: "Projected expiration" },
          { field: "dte", label: "DTE" }, { field: "bucket", label: "Bucket" },
          { field: "quantity", label: "Qty" }, { field: "strike", label: "Template strike" },
          { field: "optionPrice", label: "Today’s bid/share" }, { field: "delta", label: "Template delta" },
          { field: "score", label: "Recommendation score" }, { field: "status", label: "Risk level" },
          { field: "optionPrice", label: "Projected premium" },
        ],
      },
      policySymbolLimits: {
        columns: [
          { field: "symbol", label: "Symbol" }, { field: "quantity", label: "Shares owned" },
          { field: "quantity", label: "Maximum active contracts" }, { field: "quantity", label: "Maximum shares covered" },
          { field: "percentage", label: "Coverage" },
        ],
      },
      policyRiskDistribution: {
        columns: [
          { field: "bucket", label: "Bucket" }, { field: "quantity", label: "Contracts" },
          { field: "threshold", label: "Delta range" }, { field: "delta", label: "Target delta" },
        ],
      },
      policyWeights: {
        columns: [{ field: "text", label: "Factor" }, { field: "percentage", label: "Weight" }],
      },
      rollCandidates: {
        columns: [
          { field: "rank", label: "Rank" }, { field: "quantity", label: "Quantity" },
          { field: "contract", label: "BTC current contract" }, { field: "optionPrice", label: "BTC ask/share" },
          { field: "contract", label: "STO replacement contract" }, { field: "optionPrice", label: "STO bid/share" },
          { field: "optionPrice", label: "Replacement STO premium" }, { field: "limitPrice", label: "Combined net-credit limit/share" },
          { field: "optionPrice", label: "Additional net roll credit" }, { field: "optionPrice", label: "Additional net roll cash" },
          { field: "delta", label: "Delta" }, { field: "quantity", label: "Open interest" },
          { field: "quantity", label: "Volume" }, { field: "status", label: "Risk" },
          { field: "score", label: "Score" },
        ],
      },
      providerStatus: {
        columns: [
          { field: "text", label: "Provider" }, { field: "text", label: "Role" },
          { field: "boolean", label: "Enabled" }, { field: "status", label: "Status" },
          { field: "date", label: "Last attempt" }, { field: "narrative", label: "Details" },
        ],
      },
      marketResolution: {
        columns: [
          { field: "symbol", label: "Symbol" }, { field: "expiration", label: "Expiration" },
          { field: "strike", label: "Strike" }, { field: "source", label: "Stock source" },
          { field: "stockPrice", label: "Price" }, { field: "source", label: "Option source" },
          { field: "delta", label: "Delta" }, { field: "narrative", label: "Quote attempts" },
          { field: "narrative", label: "Option attempts" },
        ],
      },
      recentOptionActivity: {
        columns: [
          { field: "date", label: "Date" }, { field: "symbol", label: "Symbol" },
          { field: "status", label: "Action" }, { field: "quantity", label: "Contracts" },
          { field: "expiration", label: "Expiration" }, { field: "strike", label: "Strike" },
          { field: "optionPrice", label: "Fill price" }, { field: "status", label: "Status" },
        ],
      },
      optionTransactions: {
        columns: [
          { field: "date", label: "Date" }, { field: "symbol", label: "Symbol" },
          { field: "status", label: "Action" }, { field: "quantity", label: "Contracts" },
          { field: "expiration", label: "Expiration" }, { field: "strike", label: "Strike" },
          { field: "optionPrice", label: "Price/share" },
        ],
      },
      monthlyOptionCashFlow: {
        columns: [
          { field: "month", label: "Month" }, { field: "optionPrice", label: "STO deposits" },
          { field: "optionPrice", label: "BTC withdrawals" }, { field: "optionPrice", label: "Fees included" },
          { field: "optionPrice", label: "Net option cash flow" }, { field: "optionPrice", label: "Monthly target" },
          { field: "percentage", label: "Target progress" },
        ],
      },
      finalizedOutcomes: {
        columns: [
          { field: "month", label: "Month" }, { field: "optionPrice", label: "BTC-closed lifecycle P/L" },
          { field: "optionPrice", label: "Expired lifecycle P/L" }, { field: "optionPrice", label: "Assigned lifecycle P/L" },
          { field: "optionPrice", label: "Total finalized lifecycle P/L" },
        ],
      },
      decisionRules: {
        columns: [
          { field: "status", label: "Rule" }, { field: "threshold", label: "Threshold" },
          { field: "narrative", label: "Meaning" },
        ],
      },
      applicationSettings: {
        columns: [{ field: "setting", label: "Setting" }, { field: "value", label: "Value" }],
      },
    },
  };

  const allowedWidths = new Set(["compact", "medium", "standard", "roomy", "wide"]);
  Object.entries(schema.views).forEach(([viewName, view]) => {
    const labels = new Set();
    view.columns.forEach((column) => {
      const field = schema.fields[column.field];
      if (!field) throw new Error(`Presentation schema ${viewName} references unknown field ${column.field}`);
      if (labels.has(column.label)) throw new Error(`Presentation schema ${viewName} repeats column ${column.label}`);
      labels.add(column.label);
      const width = column.width || field.width;
      if (!allowedWidths.has(width)) throw new Error(`Presentation schema ${viewName}.${column.label} has invalid width ${width}`);
      const resizable = column.resizable ?? field.resizable;
      const minWidth = column.minWidth ?? field.minWidth;
      const maxWidth = column.maxWidth ?? field.maxWidth;
      if (resizable && (!(minWidth > 0) || !(maxWidth >= minWidth))) {
        throw new Error(`Presentation schema ${viewName}.${column.label} has invalid resize bounds`);
      }
    });
  });

  root.PortfolioPilotPresentationSchema = deepFreeze(schema);
})(window);
