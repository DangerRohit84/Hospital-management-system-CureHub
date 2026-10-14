package gov.hospital.hub.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import gov.hospital.hub.entity.Patient;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByCentralId(String centralId);
}
