'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Client } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', company_name: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setClients(data);
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({ name: '', company_name: '', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company_name: client.company_name,
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingClient) {
      await supabase
        .from('clients')
        .update({
          name: formData.name,
          company_name: formData.company_name,
          notes: formData.notes || null,
        })
        .eq('id', editingClient.id);
    } else {
      await supabase.from('clients').insert({
        name: formData.name,
        company_name: formData.company_name,
        notes: formData.notes || null,
        admin_id: user.id,
      });
    }

    setSaving(false);
    setShowModal(false);
    loadClients();
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Excluir o cliente "${client.company_name}"? Todos os projetos serão excluídos.`)) return;
    await supabase.from('clients').delete().eq('id', client.id);
    loadClients();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-zinc-500 mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreateModal} className="btn btn-primary">
          + Novo Cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h2 className="text-lg font-medium text-white mb-2">Nenhum cliente cadastrado</h2>
          <p className="text-zinc-500 mb-6">Crie seu primeiro cliente para começar.</p>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Criar cliente
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="glass-card p-5 card-hover"
            >
              <div className="flex items-center justify-between gap-4">
                <Link href={`/admin/clients/${client.id}`} className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{client.company_name}</h3>
                  <p className="text-sm text-zinc-500">{client.name}</p>
                  <p className="text-xs text-zinc-600 mt-1">Criado em {formatDate(client.created_at)}</p>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(client)}
                    className="btn btn-secondary btn-icon"
                    title="Editar"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(client)}
                    className="btn btn-danger btn-icon"
                    title="Excluir"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                  <Link href={`/admin/clients/${client.id}`} className="btn btn-secondary btn-sm">
                    Abrir →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-medium text-white mb-6">
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome do contato</label>
                <input
                  className="input-field"
                  placeholder="João Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome da empresa</label>
                <input
                  className="input-field"
                  placeholder="Empresa ABC"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Observações (opcional)</label>
                <textarea
                  className="input-field"
                  placeholder="Informações adicionais..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Salvando...' : editingClient ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
