// 시트(탭) 구성 (ADR-0007, PLAN.md §5). 첫 행이 헤더.
// json 컬럼은 JSON 문자열로 저장, number/boolean 컬럼은 읽을 때 변환.

export const TABLES = {
  members: {
    columns: ['id', 'name', 'memo', 'created_at'],
  },
  characters: {
    columns: [
      'id', 'member_id', 'ocid', 'name', 'world', 'class', 'level',
      'hexa_spec', 'boss_rates', 'spec_source', 'spec_updated_at',
      'combat_power', 'api_stats', 'basic_updated_at', 'created_at',
    ],
    number: ['level', 'hexa_spec', 'combat_power'],
    json: ['boss_rates', 'api_stats'],
  },
  goals: {
    columns: ['id', 'character_id', 'period', 'boss_key'],
  },
  availability: {
    // id = `${member_id}:${week_start}`
    columns: ['id', 'member_id', 'week_start', 'slots', 'memo'],
    json: ['slots'],
  },
  courses: {
    // party_size: 목표 인원(모집 파티, ADR-0013). 비면 인원 고정 안 함
    columns: ['id', 'week_start', 'title', 'start_at', 'memo', 'status', 'created_by', 'created_at', 'party_size'],
    number: ['party_size'],
  },
  course_steps: {
    columns: ['id', 'course_id', 'step_index', 'boss_key', 'cleared'],
    number: ['step_index'],
    boolean: ['cleared'],
  },
  course_members: {
    // id = `${course_id}:${character_id}`
    columns: ['id', 'course_id', 'character_id'],
  },
  boss_cuts: {
    // base_spec: 솔로 100% 기준 헥사 환산 (ADR-0009)
    columns: ['id', 'boss_key', 'base_spec', 'note', 'source', 'verified_at'],
    number: ['base_spec'],
  },
};

export function tableDef(name) {
  const def = TABLES[name];
  if (!def) throw new Error(`알 수 없는 테이블: ${name}`);
  return def;
}

// 시트 셀 문자열 → 값
export function decodeRow(name, cells) {
  const def = tableDef(name);
  const row = {};
  def.columns.forEach((col, i) => {
    const raw = cells[i] ?? '';
    if (def.json?.includes(col)) {
      try {
        row[col] = raw === '' ? null : JSON.parse(raw);
      } catch {
        row[col] = null;
      }
    } else if (def.number?.includes(col)) {
      row[col] = raw === '' ? null : Number(raw);
    } else if (def.boolean?.includes(col)) {
      row[col] = raw === true || String(raw).toUpperCase() === 'TRUE';
    } else {
      row[col] = String(raw);
    }
  });
  return row;
}

// 값 → 시트 셀 문자열
export function encodeRow(name, row) {
  const def = tableDef(name);
  return def.columns.map((col) => {
    const v = row[col];
    if (v == null) return '';
    if (def.json?.includes(col)) return JSON.stringify(v);
    if (def.boolean?.includes(col)) return v ? 'TRUE' : 'FALSE';
    return String(v);
  });
}
