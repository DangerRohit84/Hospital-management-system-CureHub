package gov.hospital.hub.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import gov.hospital.hub.entity.Appointment;
import gov.hospital.hub.entity.Doctor;
import gov.hospital.hub.entity.Hospital;
import gov.hospital.hub.entity.Patient;
import gov.hospital.hub.exception.DoubleBookingException;
import gov.hospital.hub.exception.ResourceNotFoundException;
import gov.hospital.hub.repository.AppointmentRepository;
import gov.hospital.hub.repository.DoctorRepository;
import gov.hospital.hub.repository.HospitalRepository;
import gov.hospital.hub.repository.PatientRepository;

/**
 * Booking is @Transactional and checks the (doctor, slot) pair first.
 * A duplicate BOOKED row for the same slot raises 409 DoubleBookingException.
 */
@Service
public class AppointmentService {

    private final AppointmentRepository appointments;
    private final PatientRepository patients;
    private final DoctorRepository doctors;
    private final HospitalRepository hospitals;

    public AppointmentService(AppointmentRepository appointments, PatientRepository patients,
            DoctorRepository doctors, HospitalRepository hospitals) {
        this.appointments = appointments;
        this.patients = patients;
        this.doctors = doctors;
        this.hospitals = hospitals;
    }

    public List<Appointment> list() {
        return appointments.findAll();
    }

    /** Paged list (P0: bound bulk PHI dump, default size 20). */
    public org.springframework.data.domain.Page<Appointment> list(
            org.springframework.data.domain.Pageable pageable) {
        return appointments.findAll(pageable);
    }

    public Appointment get(Long id) {
        return appointments.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("appointment " + id + " not found"));
    }

    public record BookRequest(Long patientId, Long doctorId, Long hospitalId,
            LocalDateTime appointmentTime) {
    }

    @Transactional
    public Appointment book(BookRequest req) {
        if (req.appointmentTime() == null) {
            throw new IllegalArgumentException("appointmentTime is required");
        }
        boolean clash = appointments.existsByDoctorIdAndAppointmentTimeAndStatus(
                req.doctorId(), req.appointmentTime(), "BOOKED");
        if (clash) {
            // WHY 409: slot is a real conflict, not a bad request - client must pick another slot.
            throw new DoubleBookingException("doctor " + req.doctorId()
                    + " already booked at " + req.appointmentTime());
        }
        Patient patient = patients.findById(req.patientId()).orElseThrow(
                () -> new ResourceNotFoundException("patient " + req.patientId() + " not found"));
        Doctor doctor = doctors.findById(req.doctorId()).orElseThrow(
                () -> new ResourceNotFoundException("doctor " + req.doctorId() + " not found"));
        Hospital hospital = hospitals.findById(req.hospitalId()).orElseThrow(
                () -> new ResourceNotFoundException(
                        "hospital " + req.hospitalId() + " not found"));
        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setHospital(hospital);
        appointment.setAppointmentTime(req.appointmentTime());
        appointment.setStatus("BOOKED");
        try {
            return appointments.saveAndFlush(appointment);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // P0 TOCTOU: concurrent inserts both passed the exists() check;
            // the DB UNIQUE(doctor_id, appointment_time, status) backstop fires here.
            throw new DoubleBookingException("doctor " + req.doctorId()
                    + " already booked at " + req.appointmentTime());
        }
    }

    @Transactional
    public Appointment cancel(Long id) {
        Appointment appointment = get(id);
        appointment.setStatus("CANCELLED");
        return appointments.save(appointment);
    }
}
