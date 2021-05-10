"""RAPyDo 1.2 compatibility fixes

Revision ID: c0df6c6f1d2d
Revises:
Create Date: 2021-05-10 13:56:24.115644

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c0df6c6f1d2d"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "login",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=True),
        sa.Column("IP", sa.String(length=46), nullable=True),
        sa.Column("location", sa.String(length=256), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("failed", sa.Boolean(), nullable=True),
        sa.Column("flushed", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.drop_column("token", "hostname")


def downgrade():
    op.add_column(
        "token",
        sa.Column(
            "hostname", sa.VARCHAR(length=256), autoincrement=False, nullable=True
        ),
    )
    op.drop_table("login")
