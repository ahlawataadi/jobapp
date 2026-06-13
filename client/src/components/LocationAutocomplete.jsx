import { useEffect, useRef, useState } from "react";
import { useGetAdminConfigQuery } from "../store/jobsApi.js";

let scriptPromise = null;

const loadGoogleMaps = (apiKey) => {
  if (window.google?.maps?.places) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

// Extracts city/district/state from a Google Places result's address_components.
const extractLocation = (place) => {
  const components = place?.address_components || [];
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name || "";

  return {
    city: get("locality") || get("postal_town") || get("sublocality"),
    district: get("administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    formattedAddress: place?.formatted_address || "",
  };
};

export default function LocationAutocomplete({ value, onChange, onSelect, placeholder, className }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const { data: configData } = useGetAdminConfigQuery();
  const [ready, setReady] = useState(false);

  const apiKey = configData?.config?.googleMapsApiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey)
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode"],
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = extractLocation(place);
      onChange?.(location.formattedAddress || inputRef.current.value);
      onSelect?.(location);
    });
    autocompleteRef.current = autocomplete;
  }, [ready, onChange, onSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      placeholder={placeholder || "Search address, city, district, or state"}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
