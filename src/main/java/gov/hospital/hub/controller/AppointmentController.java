package gov.hospital.hub.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import gov.hospital.hub.entity.Appointment;
import gov.hospital.hub.service.AppointmentService;
import gov.hospital.hub.service.AppointmentService.BookRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointments;

    public AppointmentController(AppointmentService appointments) {
        this.appointments = appointments;
    }

    @GetMapping
    public List<Appointment> list(
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer page,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer size) {
        // P0 pagination: ?page=&size= (size capped at 20); no params -> full list (demo compat).
        if (page == null && size == null) {
            return appointments.list();
        }
        int p = page == null ? 0 : Math.max(0, page);
        int s = size == null ? 20 : Math.min(Math.max(1, size), 20);
        return appointments
                .list(org.springframework.data.domain.PageRequest.of(p, s)).getContent();
    }

    @GetMapping("/{id}")
    public Appointment get(@PathVariable Long id) {
        return appointments.get(id);
    }

    public record BookBody(@NotNull Long patientId, @NotNull Long doctorId,
            @NotNull Long hospitalId, @NotNull @Future LocalDateTime appointmentTime) {
    }

    /** Books a slot; duplicate (doctor, time) returns 409 via DoubleBookingException. */
    @PostMapping("/book")
    public ResponseEntity<Appointment> book(@Valid @RequestBody BookBody body) {
        Appointment saved = appointments.book(new BookRequest(body.patientId(),
                body.doctorId(), body.hospitalId(), body.appointmentTime()));
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}/cancel")
    public Appointment cancel(@PathVariable Long id) {
        return appointments.cancel(id);
    }
}
