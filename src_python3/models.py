from sqlalchemy import Index, ForeignKey
from sqlalchemy.orm import relationship

from app import db


class GeniProfiles(db.Model):
    __tablename__ = 'geni_profiles'

    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.String(255))
    profile_name = db.Column(db.String(255))
    profile_details_link = db.Column(db.String(255))


class ProfileToProfile(db.Model):
    __tablename__ = 'profile_to_profile'

    id = db.Column(db.Integer, primary_key=True)
    geni_profile1_id = db.Column(db.Integer, ForeignKey("geni_profiles.id"), nullable=False)
    geni_profile2_id = db.Column(db.Integer, ForeignKey("geni_profiles.id"), nullable=False)
    profile_to_profile_link = db.Column(db.String(255))
    step_count = db.Column(db.Integer)
    profile_relationship = db.Column(db.String(255))

    geni_profile1_id_fk = relationship('GeniProfiles', foreign_keys=[geni_profile1_id])
    geni_profile2_id_fk = relationship('GeniProfiles', foreign_keys=[geni_profile2_id])


Index('profile_to_profile_index', ProfileToProfile.geni_profile1_id, ProfileToProfile.geni_profile2_id)


def db_init():
    db.create_all()
    db.session.commit()
