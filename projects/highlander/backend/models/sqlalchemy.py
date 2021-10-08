""" CUSTOM Models for the relational database """
from datetime import datetime

from restapi.connectors.sqlalchemy.models import User, db
from sqlalchemy.dialects.postgresql import JSONB

# Add (inject) attributes to User
setattr(User, "disk_quota", db.Column(db.BigInteger, default=1073741824))  # 1 GB
setattr(User, "requests", db.relationship("Request", backref="user", lazy=True))


class Request(db.Model):  # type: ignore
    __tablename__ = "request"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, index=True, nullable=False)
    dataset_name = db.Column(db.String, index=True, nullable=False)
    args = db.Column(JSONB, nullable=False)
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    status = db.Column(db.String(64))
    error_message = db.Column(db.Text)
    task_id = db.Column(db.String(64), index=True, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    output_file = db.relationship(
        "OutputFile", uselist=False, back_populates="request", cascade="delete"
    )

    def __repr__(self) -> str:
        return "<Request(name='{}', submission date='{}', status='{}')".format(
            self.name, self.submission_date, self.status
        )


class OutputFile(db.Model):  # type: ignore
    __tablename__ = "output_file"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(64), index=True, nullable=False)
    timestamp = db.Column(db.String(64), nullable=False)
    size = db.Column(db.BigInteger)
    request_id = db.Column(db.Integer, db.ForeignKey("request.id"))
    request = db.relationship("Request", back_populates="output_file")

    def __repr__(self) -> str:
        return f"<OutputFile(filename='{self.filename}', size='{self.size}')"
