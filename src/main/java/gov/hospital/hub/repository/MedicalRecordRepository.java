package gov.hospital.hub.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import gov.hospital.hub.entity.MedicalRecord;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    List<MedicalRecord> findByPatientIdOrderByVisitDateDesc(Long patientId);

    /** P0 pagination (size capped at 20 in controller): bound per-patient dump. */
    org.springframework.data.domain.Page<MedicalRecord> findByPatientIdOrderByVisitDateDesc(
            Long patientId, org.springframework.data.domain.Pageable pageable);
}
