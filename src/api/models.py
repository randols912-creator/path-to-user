import datetime
import sqlalchemy

from sqlalchemy import Index, ForeignKey
from sqlalchemy.dialects import mysql
from sqlalchemy import sql

# Define timestamp with precision of 10^-6 second
DT_MICRO = mysql.DATETIME(fsp=6)
class current_timestamp(sql.functions.GenericFunction):
    type = DT_MICRO

CURRENT_TIMESTAMP = current_timestamp(6)

metadata = sqlalchemy.MetaData()

profiles_table = sqlalchemy.Table(
    "profiles",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String(255), primary_key=True),
    sqlalchemy.Column("name", sqlalchemy.String(255)),
    sqlalchemy.Column("url", sqlalchemy.String(255)),
    sqlalchemy.Column("details", sqlalchemy.JSON),
    sqlalchemy.Column("is_user", sqlalchemy.Boolean, default=True),
    # BH data fields
    sqlalchemy.Column("bh_theme", sqlalchemy.String(255)),
    sqlalchemy.Column("bh_floor", sqlalchemy.Integer),
    sqlalchemy.Column("bh_location", sqlalchemy.JSON),
    # Last active time (for users)
    sqlalchemy.Column("last_active_on", sqlalchemy.DateTime)
)

paths_table = sqlalchemy.Table(
    "paths",
     metadata,
     sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
     sqlalchemy.Column("source_id", sqlalchemy.String(255), ForeignKey("profiles.id"), nullable=False),
     sqlalchemy.Column("target_id", sqlalchemy.String(255), ForeignKey("profiles.id"), nullable=False),
     sqlalchemy.Column("chat_id", sqlalchemy.Integer, ForeignKey("chats.id")), # chat id for u2u communication
     sqlalchemy.Column("is_user2user", sqlalchemy.Boolean, default=False),
     sqlalchemy.Column("url", sqlalchemy.String(500)),
     sqlalchemy.Column("step_count", sqlalchemy.Integer),
     sqlalchemy.Column("relationship", sqlalchemy.String(255)),
     sqlalchemy.Column("relations", sqlalchemy.JSON),
     sqlalchemy.Column("created_on", sqlalchemy.DateTime,
                       server_default=sqlalchemy.func.now()),
     sqlalchemy.Column("updated_on", sqlalchemy.DateTime,
                       server_default=sqlalchemy.func.now(),
                       server_onupdate=sqlalchemy.func.now()),
     sqlalchemy.Column("finished_on", DT_MICRO, default=datetime.datetime.min),

     Index('path_index', "source_id", "target_id"),
     Index('path_finished_index', "source_id", "finished_on")
)

chats_table = sqlalchemy.Table(
    "chats",
     metadata,
     sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
     sqlalchemy.Column("profile_id1", sqlalchemy.String(255), ForeignKey("profiles.id"), nullable=False),
     sqlalchemy.Column("profile_id2", sqlalchemy.String(255), ForeignKey("profiles.id"), nullable=False),

     sqlalchemy.Column("messages", sqlalchemy.JSON),
     # Flags whether the chat contains unread messages (for each user accordingly)
     sqlalchemy.Column("is_unread1", sqlalchemy.Boolean),
     sqlalchemy.Column("is_unread2", sqlalchemy.Boolean),

     sqlalchemy.Column("created_on", sqlalchemy.DateTime,
                       server_default=sqlalchemy.func.now()),
     sqlalchemy.Column("updated_on", sqlalchemy.DateTime,
                       server_default=sqlalchemy.func.now(),
                       server_onupdate=sqlalchemy.func.now()),

     Index('chat_index', "profile_id1", "profile_id2")
)

