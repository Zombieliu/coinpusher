import https from 'https';

export class FxService {
    /**
     * 从 exchangerate.host 获取最新汇率（免费、无需 key）
     * @param base 基准货币，默认 USD
     * @param symbols 需要的币种数组
     */
    static fetchLatest(base = 'USD', symbols: string[] = ['USD', 'CNY', 'EUR']): Promise<Record<string, number>> {
        const qs = `base=${encodeURIComponent(base)}&symbols=${symbols.map(s => encodeURIComponent(s)).join(',')}`;
        const url = `https://api.exchangerate.host/latest?${qs}`;

        return new Promise((resolve) => {
            https.get(url, res => {
                const chunks: Buffer[] = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    try {
                        const json = JSON.parse(Buffer.concat(chunks).toString());
                        if (json && json.rates) {
                            resolve(json.rates as Record<string, number>);
                        } else {
                            resolve({});
                        }
                    } catch {
                        resolve({});
                    }
                });
            }).on('error', () => resolve({}));
        });
    }
}
