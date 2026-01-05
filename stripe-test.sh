#!/usr/bin/env bash
set -euo pipefail

GATE_CONTAINER=${GATE_CONTAINER:-oops-coinpusher-gate}
USER_ID=${USER_ID:-testuser1}
PRODUCT_ID=${PRODUCT_ID:-gold_pack_small}
GATE_URL=${GATE_URL:-http://127.0.0.1:3000}

# 创建订单并解析 sessionId/paymentUrl
CREATE_JS=$(cat <<'JS'
const fetch = global.fetch || require('node-fetch');
const userId = process.env.USER_ID;
const productId = process.env.PRODUCT_ID;
const gate = process.env.GATE_URL;
(async () => {
  const r = await fetch(`${gate}/CreatePaymentOrder`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({userId, productId, channel: 'stripe'})
  });
  const data = await r.json();
  if (!data.isSucc || !data.res?.success) {
    console.error('CREATE_FAIL', JSON.stringify(data));
    process.exit(1);
  }
  const order = data.res.order;
  const url = order.paymentUrl || '';
  const m = url.match(/cs_[^\/?#]+/);
  const sessionId = m ? m[0] : '';
  console.log(`ORDER_ID=${order.orderId}`);
  console.log(`SESSION_ID=${sessionId}`);
  console.log(`PAYMENT_URL=${url}`);
})();
JS
)

echo "=> Creating Stripe order inside ${GATE_CONTAINER}..."
OUT=$(docker exec -e USER_ID="$USER_ID" -e PRODUCT_ID="$PRODUCT_ID" -e GATE_URL="$GATE_URL" "$GATE_CONTAINER" node -e "$CREATE_JS")
echo "$OUT"
ORDER_ID=$(echo "$OUT" | awk -F= '/^ORDER_ID=/{print $2}')
SESSION_ID=$(echo "$OUT" | awk -F= '/^SESSION_ID=/{print $2}')
PAYMENT_URL=$(echo "$OUT" | awk -F= '/^PAYMENT_URL=/{print $2}')

if [ -z "$ORDER_ID" ] || [ -z "$SESSION_ID" ] || [ -z "$PAYMENT_URL" ]; then
  echo "解析失败，检查上面的 CREATE_FAIL 输出" >&2
  exit 1
fi

echo
echo ">>> 打开支付链接完成测试卡支付："
echo "$PAYMENT_URL"
echo "(测试卡: 4242 4242 4242 4242 任意未来有效期/CVC)"
read -rp "支付完成后按 Enter 继续确认... "

# 确认支付
CONFIRM_JS=$(cat <<'JS'
const fetch = global.fetch || require('node-fetch');
const sessionId = process.env.SESSION_ID;
const orderId = process.env.ORDER_ID;
const gate = process.env.GATE_URL;
(async () => {
  const r = await fetch(`${gate}/ConfirmStripePayment`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({sessionId, orderId})
  });
  const data = await r.json().catch(async () => ({raw: await r.text()}));
  console.log(JSON.stringify(data, null, 2));
})();
JS
)
echo "=> Confirming payment..."
docker exec -e SESSION_ID="$SESSION_ID" -e ORDER_ID="$ORDER_ID" -e GATE_URL="$GATE_URL" "$GATE_CONTAINER" node -e "$CONFIRM_JS"
