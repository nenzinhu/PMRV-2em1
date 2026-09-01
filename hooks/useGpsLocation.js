'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { matchRodovia } from '@/lib/gps';
import { RODOVIAS_GEOJSON_URL, rodoviaLabel } from '@/lib/rodovias-list';

async function fetchEndereco(lat, lon) {
  const r = await fetch(`/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
  if (!r.ok) return { endereco: '', cidade: '', uf: '' };
  const data = await r.json();
  return {
    endereco: typeof data.endereco === 'string' ? data.endereco : '',
    cidade: typeof data.cidade === 'string' ? data.cidade : '',
    uf: typeof data.uf === 'string' ? data.uf : '',
  };
}

export function useGpsLocation() {
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsInfo, setGpsInfo] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const watchRef = useRef(null);
  const geoKeyRef = useRef('');

  const toggle = useCallback(() => setGpsOn((v) => !v), []);

  useEffect(() => {
    if (!gpsOn || geojson) return;
    let cancelled = false;
    fetch(RODOVIAS_GEOJSON_URL)
      .then((r) => r.json())
      .then((g) => {
        if (!cancelled) setGeojson(g);
      })
      .catch(() => {
        if (!cancelled) setGpsInfo({ erro: 'Falha ao carregar malha viária.' });
      });
    return () => {
      cancelled = true;
    };
  }, [gpsOn, geojson]);

  useEffect(() => {
    if (!gpsOn) {
      if (watchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      setGpsInfo(null);
      geoKeyRef.current = '';
      return;
    }
    if (!navigator.geolocation) {
      setGpsInfo({ erro: 'Geolocalização não suportada neste dispositivo.' });
      return;
    }

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const base = { lat: latitude, lon: longitude, erro: null };

        if (!geojson) {
          setGpsInfo((prev) => ({ ...(prev || {}), ...base }));
          return;
        }

        const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

        const m = matchRodovia(geojson, latitude, longitude, 150);
        if (m && !m.foraDaRodovia) {
          setGpsInfo((prev) => ({
            ...(prev || {}),
            ...base,
            rodovia: rodoviaLabel(m.rodovia) || m.rodovia,
            km: m.km,
            nome: m.nome,
            dist: m.d,
            foraDaRodovia: false,
            endereco: '',
          }));
        } else {
          const dist = m ? m.d : null;
          setGpsInfo((prev) => ({
            ...(prev || {}),
            ...base,
            foraDaRodovia: true,
            dist,
            rodovia: null,
            km: null,
          }));
        }

        // Busca cidade/UF (e endereço, quando fora da rodovia) sempre que a
        // posição mudar de forma relevante — usada para preencher o Município.
        if (key === geoKeyRef.current) return;
        geoKeyRef.current = key;
        fetchEndereco(latitude, longitude)
          .then(({ endereco, cidade, uf }) => {
            if (geoKeyRef.current !== key) return;
            setGpsInfo((prev) => ({ ...(prev || {}), endereco, cidade, uf }));
          })
          .catch(() => {});
      },
      (err) => setGpsInfo({ erro: 'GPS indisponível: ' + err.message }),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );

    return () => {
      if (watchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [gpsOn, geojson]);

  return { gpsOn, gpsInfo, toggle, setGpsOn };
}
