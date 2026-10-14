import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MobileNav from './MobileNav';

afterEach(() => cleanup());

describe('MobileNav — navegacao operacional simplificada', () => {
  it('mostra quatro areas principais em vez de seis abas do mesmo nivel', () => {
    render(<MobileNav active="envolvidos" onChange={vi.fn()} />);

    const mobile = screen.getByRole('tablist', { name: 'Navegação no celular' });
    const tabs = within(mobile).getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.textContent.trim())).toEqual([
      'Pessoas',
      'Ocorrência',
      'Relato',
      'Finalizar',
    ]);
  });

  it('abre Dinamica ao entrar na area Ocorrencia', () => {
    const onChange = vi.fn();
    render(<MobileNav active="envolvidos" onChange={onChange} />);

    const mobile = screen.getByRole('tablist', { name: 'Navegação no celular' });
    fireEvent.click(within(mobile).getByRole('tab', { name: 'Aba Ocorrência' }));
    expect(onChange).toHaveBeenCalledWith('dinamica');
  });

  it('oferece Danos, Dinamica e Resumo como etapas secundarias da ocorrencia', () => {
    const onChange = vi.fn();
    render(<MobileNav active="danos" onChange={onChange} />);

    const secondary = screen.getByRole('tablist', { name: 'Etapas da ocorrência' });
    expect(within(secondary).getAllByRole('tab')).toHaveLength(3);
    expect(within(secondary).getByRole('tab', { name: 'Danos' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(within(secondary).getByRole('tab', { name: 'Resumo' }));
    expect(onChange).toHaveBeenCalledWith('resumo');
  });

  it('nao mostra etapas secundarias fora da area Ocorrencia', () => {
    render(<MobileNav active="relato" onChange={vi.fn()} />);
    expect(screen.queryByRole('tablist', { name: 'Etapas da ocorrência' })).toBeNull();
  });

  it('mantem o foco dentro da navegacao mobile ao usar as setas', () => {
    render(<MobileNav active="envolvidos" onChange={vi.fn()} />);
    const mobile = screen.getByRole('tablist', { name: 'Navegação no celular' });

    fireEvent.keyDown(mobile, { key: 'ArrowRight' });

    expect(document.activeElement.id).toBe('pmrv-area-mobile-ocorrencia');
  });

  it('permite navegar nas etapas da ocorrencia com setas', () => {
    const onChange = vi.fn();
    render(<MobileNav active="danos" onChange={onChange} />);
    const secondary = screen.getByRole('tablist', { name: 'Etapas da ocorrência' });

    fireEvent.keyDown(secondary, { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith('dinamica');
    expect(document.activeElement.textContent).toBe('Dinâmica');
  });
});
