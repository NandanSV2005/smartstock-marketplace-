from django.apps import AppConfig


class SalesConfig(AppConfig):
    name = 'sales'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        import sales.signals  # noqa: F401 — registers the post_save signal
