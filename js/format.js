const RU_PLURAL = new Intl.PluralRules("ru");

export function nounHelper(one, few, many) {
  return (count) => {
    const numeric = Number(count);
    const safe = Number.isFinite(numeric) ? Math.abs(numeric) : 0;
    const category = RU_PLURAL.select(safe);
    if (category === "one") return one;
    if (category === "few") return few;
    return many;
  };
}

export function formatRuCount(count, one, few, many) {
  return `${count} ${nounHelper(one, few, many)(count)}`;
}
