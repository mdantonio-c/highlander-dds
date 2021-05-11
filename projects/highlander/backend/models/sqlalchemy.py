""" CUSTOM Models for the relational database """
from datetime import datetime

from restapi.connectors.sqlalchemy.models import User, db

# Add (inject) attributes to User
setattr(User, "my_custom_field", db.Column(db.String(255)))


class Request(db.Model):
    __tablename__ = "request"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, index=True, nullable=False)
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    status = db.Column(db.String(64))
    error_message = db.Column(db.Text)
    task_id = db.Column(db.String(64), index=True, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey("request.id"))
    output_file = db.relationship(
        "OutputFile", uselist=False, back_populates="request", cascade="delete"
    )

    def __repr__(self):
        return "<Request(name='{}', submission date='{}', status='{}')".format(
            self.name, self.submission_date, self.status
        )


class OutputFile(db.Model):
    __tablename__ = "output_file"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(64), index=True, unique=True)
    size = db.Column(db.BigInteger)
    request_id = db.Column(db.Integer, db.ForeignKey("request.id"))
    request = db.relationship("Request", back_populates="output_file")

    def __repr__(self):
        return f"<OutputFile(filename='{self.filename}', size='{self.size}')"
