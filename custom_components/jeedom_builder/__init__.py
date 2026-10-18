"""Constructeur de scénarios façon Jeedom — intégration Home Assistant.

Enregistre un panneau (barre latérale « Scénarios ») servi en statique, et le retire
proprement au déchargement. Aucune configuration YAML nécessaire : tout passe par
l'ajout de l'intégration dans Réglages → Appareils et services.
"""
from __future__ import annotations

import os

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    FRONTEND_VERSION,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STATIC_URL,
    WEBCOMPONENT,
)

_FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Sert le JS en statique puis enregistre le panneau."""
    hass.data.setdefault(DOMAIN, {})

    if not hass.data[DOMAIN].get("static_registered"):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, _FRONTEND_DIR, False)]
        )
        hass.data[DOMAIN]["static_registered"] = True

    # Évite une double inscription (rechargement de l'entrée).
    if PANEL_URL_PATH not in hass.data.get("frontend_panels", {}):
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL_PATH,
            webcomponent_name=WEBCOMPONENT,
            module_url=f"{STATIC_URL}/jeedom-builder-panel.js?v={FRONTEND_VERSION}",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            require_admin=True,
            embed_iframe=False,
            config={},
        )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Retire le panneau."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    return True
