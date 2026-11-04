import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Stepper from './Stepper';

afterEach(() => cleanup());

describe('Stepper — progresso anunciado', () => {
  it('expoe a etapa atual como progressbar', () => {
    render(<Stepper currentStep={2} ehVitima={false} />);

    const progresso = screen.getByRole('progressbar', { name: 'Progresso do relato' });
    expect(progresso.getAttribute('aria-valuemin')).toBe('1');
    expect(progresso.getAttribute('aria-valuemax')).toBe('4');
    expect(progresso.getAttribute('aria-valuenow')).toBe('2');
    expect(progresso.getAttribute('aria-valuetext')).toBe('Etapa 2 de 4');
  });

  it('conta cinco etapas quando ha vitima', () => {
    render(<Stepper currentStep={4} ehVitima />);

    const progresso = screen.getByRole('progressbar', { name: 'Progresso do relato' });
    expect(progresso.getAttribute('aria-valuemax')).toBe('5');
    expect(progresso.getAttribute('aria-valuetext')).toBe('Etapa 4 de 5');
  });

  it('mantem os pontos decorativos fora da arvore de acessibilidade', () => {
    const { container } = render(<Stepper currentStep={1} ehVitima={false} />);
    const pontos = container.querySelectorAll('.step-dot');
    expect(pontos.length).toBeGreaterThan(0);
    pontos.forEach((ponto) => expect(ponto.getAttribute('aria-hidden')).toBe('true'));
  });
});
