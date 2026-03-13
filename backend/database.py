from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Course(db.Model):
    __tablename__ = 'course'
    course_code = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    course_type = db.Column(db.String(50), nullable=True) # "Obligatorio" or "Electivo"
    
    # Relationship to Section
    sections = db.relationship('Section', backref='course', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'course_code': self.course_code,
            'name': self.name,
            'course_type': self.course_type,
            'sections': [s.to_dict() for s in self.sections]
        }

class Section(db.Model):
    __tablename__ = 'section'
    id = db.Column(db.Integer, primary_key=True)
    course_code = db.Column(db.String(20), db.ForeignKey('course.course_code'), nullable=False)
    name = db.Column(db.String(100), nullable=False) # "TEORÍA 1", "LABORATORIO 11"
    modality = db.Column(db.String(50), nullable=True) # "Presencial", "Sincronico"
    professor_name = db.Column(db.String(150), nullable=True)
    
    # Relationship to Schedule
    schedules = db.relationship('Schedule', backref='section', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'course_code': self.course_code,
            'name': self.name,
            'modality': self.modality,
            'professor_name': self.professor_name,
            'schedules': [sched.to_dict() for sched in self.schedules]
        }

class Schedule(db.Model):
    __tablename__ = 'schedule'
    id = db.Column(db.Integer, primary_key=True)
    section_id = db.Column(db.Integer, db.ForeignKey('section.id'), nullable=False)
    day = db.Column(db.String(10), nullable=False) # "Lun", "Mar", "Mie"
    start_time = db.Column(db.String(5), nullable=False) # "17:00"
    end_time = db.Column(db.String(5), nullable=False) # "19:00"
    frequency = db.Column(db.String(50), nullable=True) # "Semana General", "Semana A"
    location = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'day': self.day,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'frequency': self.frequency,
            'location': self.location
        }
