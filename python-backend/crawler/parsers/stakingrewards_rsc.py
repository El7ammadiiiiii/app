"""
🥩 محلل بيانات StakingRewards — RSC Parser
════════════════════════════════════════════
يستخرج بيانات الستاكينغ من RSC payload المضمّن في HTML.

صفحة /assets تحتوي على بيانات 19+ أصل مع:
- 3 مقاييس لكل أصل: price, reward_rate, staked_tokens
- 274+ قيمة reward_rate عبر كل المزودين
- بيانات changePercentages (1y, 7d, 24h, 30d, 90d)
- روابط stakelinks + أنواع المزودين
"""

import re
import json
from typing import Dict, List, Optional, Any
from loguru import logger

from ..models_stakingrewards import (
    StakingAsset,
    StakingProvider,
    StakingRewardsSnapshot,
)


def _safe_float(val, default=None):
    """تحويل آمن إلى float"""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _unescape_rsc(html: str) -> str:
    """
    استخراج ودمج RSC chunks من HTML ثم فك التشفير.
    RSC = React Server Components — البيانات المضمّنة في self.__next_f.push([...])
    """
    chunks = re.findall(
        r'self\.__next_f\.push\(\[.*?,\s*"(.*?)"\]\)',
        html,
        re.DOTALL,
    )
    raw = "\n".join(chunks)
    # فك الترميز المزدوج
    text = raw.replace('\\"', '"').replace('\\\\', '\\')
    return text


def _extract_assets(text: str) -> List[Dict[str, str]]:
    """
    استخراج قائمة الأصول من RSC text.
    يبحث عن نمط: "slug":"xxx","name":"XXX","symbol":"XXX","logoUrl":"..."
    """
    pattern = re.compile(
        r'"slug":"([^"]+)","name":"([^"]+)","symbol":"([^"]+)","logoUrl":"([^"]*)"'
    )
    seen = set()
    assets = []
    for m in pattern.finditer(text):
        slug = m.group(1)
        if slug not in seen:
            seen.add(slug)
            assets.append({
                "slug": slug,
                "name": m.group(2),
                "symbol": m.group(3),
                "logo": m.group(4),
            })
    return assets


def _extract_metrics_block(text: str, start_pos: int, end_pos: int) -> Dict[str, Any]:
    """
    استخراج المقاييس (metrics) من كتلة نصية محددة.
    يبحث عن metricKey + defaultValue + changePercentages.
    """
    block = text[start_pos:end_pos]
    metrics = {}

    # استخراج كل مقياس — نمط محدود لعدم تجاوز حدود الكائن
    # كل مقياس يحتوي على metricKey + defaultValue ضمن ~500 حرف
    pattern = re.compile(
        r'"metricKey":"([^"]+)".{0,500}?"defaultValue":([\d.]+|null)',
    )

    for m in pattern.finditer(block):
        key = m.group(1)
        val = _safe_float(m.group(2))

        if key not in metrics:  # أول قيمة = القيمة الرئيسية
            metrics[key] = {
                "value": val,
                "changes": {},
            }

    # استخراج changePercentages بشكل منفصل
    change_pattern = re.compile(
        r'"metricKey":"([^"]+)".{0,2000}?"changePercentages":"(\{[^"]*\})"',
    )
    for m in change_pattern.finditer(block):
        key = m.group(1)
        if key in metrics:
            try:
                ch_text = m.group(2).replace('\\', '')
                metrics[key]["changes"] = json.loads(ch_text)
            except (json.JSONDecodeError, ValueError):
                pass

    return metrics


def _extract_reward_rates_for_asset(text: str, start_pos: int, end_pos: int) -> List[float]:
    """
    استخراج كل قيم reward_rate لمزودي أصل واحد.
    """
    block = text[start_pos:end_pos]
    pattern = re.compile(
        r'"metricKey":"reward_rate"[^}]*?"defaultValue":([\d.]+)'
    )
    return [_safe_float(m.group(1)) for m in pattern.finditer(block) if _safe_float(m.group(1)) is not None]


def _extract_metric_value(block: str, metric_key: str) -> Optional[float]:
    """استخراج قيمة defaultValue لمقياس محدد داخل block."""
    escaped = re.escape(metric_key)
    m = re.search(
        rf'"metricKey":"{escaped}".{{0,1200}}?"defaultValue":([\-\d.]+|null)',
        block,
        re.DOTALL,
    )
    if not m:
        return None
    return _safe_float(m.group(1))


def _extract_providers(text: str, start_pos: int, end_pos: int) -> List[StakingProvider]:
    """
    استخراج المزودين من كتلة أصل.
    """
    block = text[start_pos:end_pos]
    providers = []

    # البحث عن كتل المزود: stakelink + type
    prov_pattern = re.compile(
        r'"links":"(\{[^"]*stakelink[^"]*\})".*?"type":\{"key":"([^"]+)"',
        re.DOTALL,
    )

    for m in prov_pattern.finditer(block):
        links_raw = m.group(1).replace('\\', '')
        ptype = m.group(2)
        try:
            links = json.loads(links_raw)
            providers.append(StakingProvider(
                provider_type=ptype,
                stakelink=links.get("stakelink", ""),
            ))
        except (json.JSONDecodeError, ValueError):
            pass

    return providers


def parse_stakingrewards_page(
    html: str,
    timeframe: str = "7d",
    category_key: Optional[str] = None,
    ecosystem_key: Optional[str] = None,
) -> StakingRewardsSnapshot:
    """
    تحليل صفحة StakingRewards الكاملة واستخراج كل بيانات الستاكينغ.

    Args:
        html: HTML الخام من صفحة /assets أو /assets/{slug}

    Returns:
        StakingRewardsSnapshot مع كل الأصول والمقاييس
    """
    text = _unescape_rsc(html)

    if not text:
        logger.warning("❌ لا توجد RSC chunks في الصفحة")
        return StakingRewardsSnapshot(errors=["No RSC data found"])

    # 1. استخراج الأصول
    asset_defs = _extract_assets(text)
    logger.info(f"🥩 عثرنا على {len(asset_defs)} أصل في RSC payload")

    if not asset_defs:
        return StakingRewardsSnapshot(errors=["No asset entries found"])

    # 2. إيجاد حدود كل أصل في النص
    #    بنية RSC الدقيقة:
    #    "metrics":[{"metricKey":"price","defaultValue":2036}],"slug":"xxx",...
    #    ← مصفوفة metrics تحتوي price فقط (قبل slug)
    #    "rewardOptionsWithAssetAsInput":[{...providers with reward_rate/staked_tokens...}]
    #    ← المزودون بعد slug يحتوون reward_rate + staked_tokens
    asset_positions = []
    for ad in asset_defs:
        pattern = f'"slug":"{re.escape(ad["slug"])}"'
        match = re.search(pattern, text)
        if match:
            asset_positions.append((ad, match.start()))

    # ترتيب حسب الموقع
    asset_positions.sort(key=lambda x: x[1])

    # 3. تحليل كل أصل
    assets = []
    total_staked_value = 0.0
    all_reward_rates = []

    for i, (ad, pos) in enumerate(asset_positions):
        next_pos = asset_positions[i + 1][1] if i + 1 < len(asset_positions) else len(text)

        # ── السعر من metrics array (قبل slug) ──
        # بنية: "metrics":[{..."metricKey":"price"..."defaultValue":XXX...}],"slug":"xxx"
        back_text = text[max(0, pos - 1000):pos]
        price = None
        price_changes = {}

        # البحث عن "metrics":[ ← بداية المصفوفة
        metrics_idx = back_text.rfind('"metrics":[')
        if metrics_idx >= 0:
            metrics_block = back_text[metrics_idx:]
            price_m = re.search(
                r'"metricKey":"price".{0,500}?"defaultValue":([\d.]+|null)',
                metrics_block
            )
            if price_m:
                price = _safe_float(price_m.group(1))

            # changePercentages للسعر
            ch_m = re.search(
                r'"metricKey":"price".{0,800}?"changePercentages":"(\{[^"]*\})"',
                metrics_block
            )
            if ch_m:
                try:
                    price_changes = json.loads(ch_m.group(1).replace('\\', ''))
                except (json.JSONDecodeError, ValueError):
                    pass

        # ── reward_rate + staked_tokens من المزودين (بعد slug) ──
        forward_text = text[pos:next_pos]
        
        # أول reward_rate بعد slug = معدل المكافأة الأساسي
        rr_match = re.search(
            r'"metricKey":"reward_rate".{0,500}?"defaultValue":([\d.]+)',
            forward_text
        )
        reward = _safe_float(rr_match.group(1)) if rr_match else None

        # staked_tokens
        st_match = re.search(
            r'"metricKey":"staked_tokens".{0,500}?"defaultValue":([\d.]+)',
            forward_text
        )
        staked = _safe_float(st_match.group(1)) if st_match else None

        # كل قيم reward_rate لهذا الأصل (min/max)
        rr_values = _extract_reward_rates_for_asset(text, pos, next_pos)

        # changePercentages لـ reward_rate
        rr_changes = {}
        ch_rr = re.search(
            r'"metricKey":"reward_rate".{0,2000}?"changePercentages":"(\{[^"]*\})"',
            forward_text
        )
        if ch_rr:
            try:
                rr_changes = json.loads(ch_rr.group(1).replace('\\', ''))
            except (json.JSONDecodeError, ValueError):
                pass

        # ── المزودون ──
        providers = _extract_providers(text, pos, next_pos)

        staking_marketcap = None
        if staked and price:
            staking_marketcap = staked * price

        staking_ratio = _extract_metric_value(forward_text, "staking_ratio")
        reputation = _extract_metric_value(forward_text, "reputation")
        net_staking_flow_7d = _extract_metric_value(forward_text, "net_staking_flow_7d")

        type_keys: List[str] = []
        ecosystem_keys: List[str] = []
        if category_key:
            if category_key.endswith("-ecosystem"):
                ecosystem_keys.append(category_key)
            elif category_key != "all":
                type_keys.append(category_key)
        if ecosystem_key:
            ecosystem_keys.append(ecosystem_key)

        asset = StakingAsset(
            slug=ad["slug"],
            name=ad["name"],
            symbol=ad["symbol"],
            logo_url=ad.get("logo", ""),
            price_usd=price,
            reward_rate=reward,
            reward_rate_min=min(rr_values) if rr_values else None,
            reward_rate_max=max(rr_values) if rr_values else None,
            staked_tokens=staked,
            reward_change_24h=_safe_float(rr_changes.get("24h")),
            reward_change_7d=_safe_float(rr_changes.get("7d")),
            reward_change_30d=_safe_float(rr_changes.get("30d")),
            price_change_24h=_safe_float(price_changes.get("24h")),
            providers=providers,
            providers_count=len(providers),
            timeframe_metrics={
                timeframe: {
                    "reward_rate": reward,
                    "price": price,
                    "staking_marketcap": staking_marketcap,
                    "staking_ratio": staking_ratio,
                    "reputation": reputation,
                    "net_staking_flow_7d": net_staking_flow_7d,
                }
            },
            type_keys=type_keys,
            ecosystem_keys=ecosystem_keys,
        )

        # حساب staking value
        if staked and price and price > 0:
            staked_value = staked * price
            total_staked_value += staked_value

        if reward:
            all_reward_rates.append(reward)

        assets.append(asset)
        logger.debug(
            f"  ✅ {asset.symbol:6s} rate={reward or '?':>8} "
            f"price=${price or 0:>10,.2f} "
            f"providers={len(providers)}"
        )

    # 4. بناء اللقطة
    avg_rate = (
        sum(all_reward_rates) / len(all_reward_rates)
        if all_reward_rates
        else None
    )

    snapshot = StakingRewardsSnapshot(
        assets=assets,
        assets_count=len(assets),
        avg_reward_rate=avg_rate,
        total_staked_value_usd=total_staked_value if total_staked_value > 0 else None,
    )

    logger.info(
        f"🥩 StakingRewards: {len(assets)} أصل | "
        f"متوسط المكافآت: {avg_rate:.2f}%" if avg_rate else "?"
    )

    return snapshot


# ── خريطة المحللات للاستخدام من الخارج ──
PARSER_MAP = {
    "stakingrewards": parse_stakingrewards_page,
}


def get_parser(endpoint: str):
    """الحصول على دالة التحليل المناسبة"""
    return PARSER_MAP.get(endpoint)
