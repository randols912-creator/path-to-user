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
    sqlalchemy.Column("is_user", sqlalchemy.Boolean, default=True)
)

paths_table = sqlalchemy.Table(
    "paths",
     metadata,
     sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True),
     sqlalchemy.Column("source_id", sqlalchemy.Integer, ForeignKey("profiles.id"), nullable=False),
     sqlalchemy.Column("target_id", sqlalchemy.Integer, ForeignKey("profiles.id"), nullable=False),
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

