"""Config flow : ajout en un clic, instance unique, aucune saisie."""
from __future__ import annotations

from homeassistant.config_entries import ConfigFlow

from .const import DOMAIN, PANEL_TITLE


class JeedomBuilderConfigFlow(ConfigFlow, domain=DOMAIN):
    """Flux de configuration minimal (instance unique)."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title=PANEL_TITLE, data={})
        return self.async_show_form(step_id="user")
