package gov.hospital.hub.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import gov.hospital.hub.entity.Hospital;
import gov.hospital.hub.entity.Patient;
import gov.hospital.hub.exception.ResourceNotFoundException;
import gov.hospital.hub.repository.AppointmentRepository;
import gov.hospital.hub.repository.HospitalRepository;
import gov.hospital.hub.repository.MedicalRecordRepository;
import gov.hospital.hub.repository.PatientRepository;
import gov.hospital.hub.repository.ReferralRepository;

@Service
public class PatientService {

    private final PatientRepository patients;
    private final HospitalRepository hospitals;
    private final AppointmentRepository appointments;
    private final MedicalRecordRepository records;
    private final ReferralRepository referrals;

    public PatientService(PatientRepository patients, HospitalRepository hospitals,
            AppointmentRepository appointments, MedicalRecordRepository records,
            ReferralRepository referrals) {
        this.patients = patients;
        this.hospitals = hospitals;
        this.appointments = appointments;
        this.records = records;
        this.referrals = referrals;
    }

    public List<Patient> list() {
        return patients.findAll();
    }

    /** Paged list (P0: bound bulk PHI dump, default size 20). */
    public org.springframework.data.domain.Page<Patient> list(
            org.springframework.data.domain.Pageable pageable) {
        return patients.findAll(pageable);
    }

    public Patient get(Long id) {
        return patients.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("patient " + id + " not found"));
    }

    public Patient getByCentralId(String centralId) {
        return patients.findByCentralId(centralId).orElseThrow(
                () -> new ResourceNotFoundException(
                        "patient centralId " + centralId + " not found"));
    }

    public record CreatePatientRequest(String centralId, String name, int age, String gender,
            String phone, Long hospitalId) {
    }

    @Transactional
    public Patient create(CreatePatientRequest req) {
        patients.findByCentralId(req.centralId()).ifPresent(p -> {
            throw new IllegalStateException("centralId " + req.centralId() + " already exists");
        });
        Hospital hospital = null;
        if (req.hospitalId() != null) {
            hospital = hospitals.findById(req.hospitalId()).orElseThrow(
                    () -> new ResourceNotFoundException(
                            "hospital " + req.hospitalId() + " not found"));
        }
        Patient patient = new Patient(req.centralId(), req.name(), req.age(), req.gender(),
                req.phone(), hospital);
        return patients.save(patient);
    }

    /**
     * Central history: one call returns visits across ALL hospitals for a centralId.
     * WHY: proves no fragmented data - everything is joined by patient id.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> history(Long patientId) {
        Patient patient = get(patientId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("patient", patient);
        out.put("appointments", appointments.findByPatientId(patientId));
        out.put("medicalRecords", records.findByPatientIdOrderByVisitDateDesc(patientId));
        out.put("referrals", referrals.findByPatientId(patientId));
        return out;
    }
}
