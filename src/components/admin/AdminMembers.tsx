import React, { useEffect, useState } from 'react';
import { RefreshCw, Award, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { UserProfile } from '../../types';

const TIER_COLOR: Record<string, string> = {
  'Standard':         'bg-slate-50 text-slate-600 border border-slate-200',
  'Popular VIP':      'bg-sky-50 text-sky-700 border border-sky-200',
  'Gold Fidelidade':  'bg-amber-50 text-amber-705 border border-amber-250'
};

export const AdminMembers: React.FC = () => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async (showFullLoader = false) => {
    if (showFullLoader || members.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const data = await api.getAdminUsers();
      setMembers(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(true); }, []);

  const filtered = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()) || (m.cpf && m.cpf.includes(search))
  );

  return (
    <div className="space-y-4 text-slate-700">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou CPF..."
          className="flex-1 min-w-[200px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
        />
        <button
          onClick={() => load(false)}
          disabled={refreshing || loading}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-xs text-slate-500 font-bold">{filtered.length} membro(s) encontrado(s)</p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          Nenhum membro encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
          {filtered.map(m => (
            <div key={m.id} className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow transition-all space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-black text-lg flex items-center justify-center shrink-0 shadow-inner">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm truncate">{m.name}</span>
                    {m.role === 'admin' && (
                      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${TIER_COLOR[m.membershipTier] ?? TIER_COLOR['Standard']}`}>
                      {m.membershipTier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{m.email}</p>
                  {m.phone && <p className="text-[11px] text-slate-400 font-semibold mt-0.5">📞 {m.phone}</p>}
                </div>
              </div>

              {m.healthNotes && (
                <div className="text-[11px] text-amber-800 bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl">
                  <strong>Histórico Clínico / Alergias:</strong> {m.healthNotes}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2">
                <p className="text-[10px] text-slate-400 font-semibold">
                  Membro desde {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                </p>
                <div className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 shrink-0">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black text-blue-700">{m.loyaltyPoints ?? 0}</span>
                  <span className="text-[10px] text-blue-600 font-bold">pts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
