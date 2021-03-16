""" CUSTOM Models for the relational database """

from restapi.connectors.sqlalchemy.models import User, db

# Add (inject) attributes to User
setattr(User, "my_custom_field", db.Column(db.String(255)))
