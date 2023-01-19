""" CUSTOM Models for the relational database """
import enum
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
    schedule_id = db.Column(db.Integer, db.ForeignKey("schedule.id"))

    def __repr__(self) -> str:
        return "<Request(name='{}', submission date='{}', status='{}')".format(
            self.name, self.submission_date, self.status
        )


class OutputFile(db.Model):  # type: ignore
    __tablename__ = "output_file"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.Text, index=True, nullable=False)
    timestamp = db.Column(db.String(64))
    size = db.Column(db.BigInteger)
    request_id = db.Column(db.Integer, db.ForeignKey("request.id"))
    request = db.relationship("Request", back_populates="output_file")

    def __repr__(self) -> str:
        filepath = f"{self.timestamp}/" or ""
        filepath += self.filename
        return f"<OutputFile(filepath='{filepath}', size='{self.size}')"


class PeriodEnum(enum.Enum):
    days = 1
    hours = 2
    minutes = 3
    seconds = 4
    microseconds = 5


class Schedule(db.Model):  # type: ignore
    __tablename__ = "schedule"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, index=True, nullable=False)
    type = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    crontab = db.Column(db.String(64))
    period = db.Column(db.Enum(PeriodEnum))
    every = db.Column(db.Integer)
    on_data_ready = db.Column(db.Boolean, default=False)
    is_enabled = db.Column(db.Boolean, default=True)
    task_name = db.Column(db.String(64))
    task_args = db.Column(JSONB)

    __mapper_args__ = {
        "polymorphic_identity": "schedule",
        "polymorphic_on": type,
    }

    def __repr__(self):
        return "<Schedule(name='{}', type='{}', created_at='{}', enabled='{}')".format(
            self.name, self.type, self.created_at, self.is_enabled
        )


class UserSchedule(Schedule):  # type: ignore
    __tablename__ = "user_schedule"
    id = db.Column(db.Integer, db.ForeignKey("schedule.id"), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    request = db.relationship("Request", backref="user_schedule", lazy="dynamic")

    __mapper_args__ = {
        "polymorphic_identity": "user_schedule",
    }


class SystemSchedule(Schedule):  # type: ignore
    __tablename__ = "system_schedule"
    id = db.Column(db.Integer, db.ForeignKey("schedule.id"), primary_key=True)

    __mapper_args__ = {
        "polymorphic_identity": "system_schedule",
    }
