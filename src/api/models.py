import datetime
import sqlalchemy

from sqlalchemy import Index, ForeignKey
from sqlalchemy.dialects import mysql
from sqlalchemy import sql

# Define timestamp with precision of 10^-6 second
DT_MICRO = mysql.DATETIME(fsp=6)
# SQLAlchemy 2.0: use the built-in now() with fractional-seconds precision
CURRENT_TIMESTAMP = sqlalchemy.func.now(6)

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




# Editable list of preset target projects shown in the app's picker.
# Managed through the /admin page; seeded from the old hardcoded list on first boot.
preset_projects_table = sqlalchemy.Table(
    "preset_projects",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String(64), primary_key=True),   # e.g. 'project-10373'
    sqlalchemy.Column("label", sqlalchemy.String(255), nullable=False),
    sqlalchemy.Column("sort_order", sqlalchemy.Integer, default=0),
    sqlalchemy.Column("enabled", sqlalchemy.Boolean, default=True),
)
